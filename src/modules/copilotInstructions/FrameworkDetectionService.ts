/**
 * Framework Detection Service
 * Enhanced framework detection for Copilot instruction generation
 */

import { WorkspaceAnalyzer, WorkspaceAnalysis } from '../../utils/WorkspaceAnalyzer';

export interface FrameworkInfo {
    name: string;
    version: string | null;
    confidence: number;
    features: string[];
}

export abstract class FrameworkDetector {
    abstract detect(analysis: WorkspaceAnalysis): FrameworkInfo | null;
    
    /**
     * Enhance detection with additional analysis
     */
    enhance(analysis: WorkspaceAnalysis): FrameworkInfo | null {
        const basic = this.detect(analysis);
        if (basic) {
            // Add confidence based on multiple signals
            basic.confidence = this.calculateConfidence(basic, analysis);
        }
        return basic;
    }
    
    protected calculateConfidence(info: FrameworkInfo, analysis: WorkspaceAnalysis): number {
        let confidence = 0.5; // Base confidence
        
        // Increase confidence if version is detected
        if (info.version) {
            confidence += 0.2;
        }
        
        // Increase confidence if TypeScript is configured
        if (analysis.typescript.hasConfig) {
            confidence += 0.1;
        }
        
        // Increase confidence based on feature count
        confidence += Math.min(info.features.length * 0.05, 0.2);
        
        return Math.min(confidence, 1.0);
    }
}

class AngularDetector extends FrameworkDetector {
    detect(analysis: WorkspaceAnalysis): FrameworkInfo | null {
        const angularFramework = analysis.frontendFrameworks.find(
            f => f.toLowerCase().includes('angular')
        );
        
        if (!angularFramework) {
            return null;
        }
        
        // Extract version
        const versionMatch = angularFramework.match(/Angular\s+(\d+\.\d+)/i);
        const version = versionMatch ? versionMatch[1] : null;
        
        // Detect Angular 17+ features
        const features: string[] = [];
        const majorVersion = version ? parseInt(version.split('.')[0]) : 0;
        
        if (majorVersion >= 17) {
            features.push('New control flow syntax (@if, @for, @switch)');
            features.push('Deferred loading with @defer');
            features.push('Improved hybrid rendering');
        }
        
        if (majorVersion >= 16) {
            features.push('Signals API');
            features.push('Required inputs');
            features.push('Passing router data as input');
        }
        
        if (majorVersion >= 15) {
            features.push('Standalone components');
            features.push('Material Design 3 support');
        }
        
        return {
            name: 'Angular',
            version,
            confidence: 0,
            features
        };
    }
}

class ReactDetector extends FrameworkDetector {
    detect(analysis: WorkspaceAnalysis): FrameworkInfo | null {
        const reactFramework = analysis.frontendFrameworks.find(
            f => f.toLowerCase().includes('react')
        );
        
        if (!reactFramework) {
            return null;
        }
        
        // Extract version
        const versionMatch = reactFramework.match(/React\s+(\d+\.\d+)/i);
        const version = versionMatch ? versionMatch[1] : null;
        
        // Detect React features
        const features: string[] = [];
        const majorVersion = version ? parseInt(version.split('.')[0]) : 0;
        
        if (majorVersion >= 18) {
            features.push('Server Components');
            features.push('Concurrent features');
            features.push('Automatic batching');
            features.push('Suspense on the server');
        }
        
        if (majorVersion >= 17) {
            features.push('New JSX Transform');
        }
        
        // Check for Next.js
        const hasNextJs = analysis.frontendFrameworks.some(
            f => f.toLowerCase().includes('next')
        );
        
        if (hasNextJs) {
            features.push('Next.js App Router');
            features.push('React Server Components');
        }
        
        return {
            name: 'React',
            version,
            confidence: 0,
            features
        };
    }
}

class VueDetector extends FrameworkDetector {
    detect(analysis: WorkspaceAnalysis): FrameworkInfo | null {
        const vueFramework = analysis.frontendFrameworks.find(
            f => f.toLowerCase().includes('vue')
        );
        
        if (!vueFramework) {
            return null;
        }
        
        // Extract version
        const versionMatch = vueFramework.match(/Vue\s+(\d+\.\d+)/i);
        const version = versionMatch ? versionMatch[1] : null;
        
        // Detect Vue features
        const features: string[] = [];
        const majorVersion = version ? parseInt(version.split('.')[0]) : 0;
        
        if (majorVersion >= 3) {
            features.push('Composition API');
            features.push('<script setup> syntax');
            features.push('Multiple root elements');
            features.push('Teleport component');
            features.push('Suspense component');
        }
        
        // Check for Nuxt
        const hasNuxt = analysis.frontendFrameworks.some(
            f => f.toLowerCase().includes('nuxt')
        );
        
        if (hasNuxt) {
            features.push('Nuxt 3 features');
            features.push('Auto imports');
            features.push('File-based routing');
        }
        
        return {
            name: 'Vue',
            version,
            confidence: 0,
            features
        };
    }
}

class TypeScriptDetector extends FrameworkDetector {
    detect(analysis: WorkspaceAnalysis): FrameworkInfo | null {
        if (!analysis.typescript.version && !analysis.typescript.hasConfig) {
            return null;
        }
        
        const features: string[] = [];
        
        if (analysis.typescript.hasConfig) {
            features.push('TypeScript configuration detected');
        }
        
        const version = analysis.typescript.version;
        if (version) {
            const majorVersion = parseInt(version.split('.')[0]);
            
            if (majorVersion >= 5) {
                features.push('Decorators');
                features.push('const type parameters');
                features.push('satisfies operator');
            }
            
            if (majorVersion >= 4) {
                features.push('Template literal types');
                features.push('Labeled tuple elements');
            }
        }
        
        return {
            name: 'TypeScript',
            version,
            confidence: 0,
            features
        };
    }
}

class JestDetector extends FrameworkDetector {
    detect(analysis: WorkspaceAnalysis): FrameworkInfo | null {
        const jestFramework = analysis.testFrameworks.find(
            f => f.toLowerCase().includes('jest')
        );
        
        if (!jestFramework) {
            return null;
        }
        
        // Extract version
        const versionMatch = jestFramework.match(/Jest\s+(\d+\.\d+)/i);
        const version = versionMatch ? versionMatch[1] : null;
        
        const features: string[] = [
            'Snapshot testing',
            'Mock functions',
            'Code coverage',
            'Parallel test execution'
        ];
        
        const majorVersion = version ? parseInt(version.split('.')[0]) : 0;
        if (majorVersion >= 29) {
            features.push('Jest 29 features');
            features.push('Improved TypeScript support');
        }
        
        return {
            name: 'Jest',
            version,
            confidence: 0,
            features
        };
    }
}

export class FrameworkDetectionService {
    private detectors: FrameworkDetector[] = [
        new AngularDetector(),
        new ReactDetector(),
        new VueDetector(),
        new TypeScriptDetector(),
        new JestDetector()
    ];
    
    constructor(private workspaceAnalyzer: WorkspaceAnalyzer) {}
    
    /**
     * Detect all frameworks in the workspace
     */
    async detectFrameworks(): Promise<FrameworkInfo[]> {
        const analysis = await this.workspaceAnalyzer.analyze();
        
        const frameworks = this.detectors
            .map(detector => detector.enhance(analysis))
            .filter((result): result is FrameworkInfo => result !== null)
            .sort((a, b) => b.confidence - a.confidence);
        
        return frameworks;
    }
    
    /**
     * Get specific framework info
     */
    async getFrameworkInfo(frameworkName: string): Promise<FrameworkInfo | null> {
        const frameworks = await this.detectFrameworks();
        return frameworks.find(
            f => f.name.toLowerCase() === frameworkName.toLowerCase()
        ) || null;
    }
}