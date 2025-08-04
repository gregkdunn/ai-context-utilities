# AI Context Util v3.6.0 - Non-Nx Project Support Planning

**Last Updated**: August 4, 2025  
**Expiration**: February 4, 2026  
**Status**: Planning Phase  
**Target Release**: Q4 2025  

---

## Brutal Honesty: What We're Missing

### 🚨 **Critical Gaps in Current Implementation**

1. **Menu System is Still Nx-Centric**
   - "Affected Tests" menu option is meaningless without Nx dependency graph
   - "Project Browser" assumes Nx project structure
   - Command descriptions use Nx terminology
   - Quick actions don't align with non-Nx workflows

2. **Project Discovery is Broken for Non-Nx**
   - Assumes `project.json` or `angular.json` files
   - Doesn't understand package-based monorepos (Lerna, Rush, etc.)
   - Missing support for simple multi-package structures
   - Can't detect workspace-style projects without Nx

3. **Test Intelligence is Nx-Dependent**
   - "Affected" logic relies on Nx's dependency graph
   - Performance optimizations assume Nx caching
   - Test file patterns are Nx-biased
   - Missing support for workspace: protocols

4. **Configuration UX is Confusing**
   - Users don't know what type of project they have
   - No guidance for non-Nx setup
   - Missing project type detection feedback
   - Configuration examples are all Nx-focused

5. **Context Generation Misses Non-Nx Patterns**
   - Copilot Instructions assume Nx structure
   - Missing detection of common non-Nx tools (Turborepo, Rush, Lerna)
   - Framework detection is incomplete
   - Build tool detection is limited

---

## 📋 **v3.6.0 Planning: "Universal Workspace Support"**

### **Phase 1: Project Type Detection & Adaptation**

#### **1.1 Enhanced Project Type Detection**
```markdown
**Goal**: Automatically detect and adapt to different project architectures

**Detection Matrix**:
- Nx Workspace (current - works well)
- Turborepo (turbo.json + packages)
- Lerna (lerna.json + packages)  
- Rush (rush.json + apps/packages)
- Yarn Workspaces (workspace: in package.json)
- npm Workspaces (workspaces in package.json)
- Standalone Projects (single package.json)
- Multi-Package Without Tools (multiple package.json files)

**Implementation**:
- New `ProjectArchitectureDetector` service
- Confidence scoring for each type
- Support for hybrid setups
- Clear user feedback about detected type
```

#### **1.2 Adaptive Menu System**
```markdown
**Current Problem**: Same menu for all project types

**Solution**: Context-aware menus that adapt based on project type

**Nx Workspace Menu**:
- ✅ Test Affected
- ✅ Project Browser
- ✅ Git Context
- ✅ Prepare to Push

**Turborepo Menu**:
- 🔄 Test Changed (turbo run test --filter=[SINCE])
- 🔄 Package Browser
- ✅ Git Context  
- 🔄 Build Pipeline

**Lerna Menu**:
- 🔄 Test Changed (lerna run test --since)
- 🔄 Package Browser
- ✅ Git Context
- 🔄 Publish Check

**Standalone Project Menu**:
- 🔄 Run Tests
- 🔄 Run Scripts
- ✅ Git Context
- 🔄 Build & Test
```

#### **1.3 Smart Command Translation**
```markdown
**Problem**: "Affected tests" concept doesn't exist outside Nx

**Solution**: Intelligent command mapping based on project type

**Command Mapping**:
- `affected:test` → `turbo run test --filter=[SINCE]` (Turborepo)
- `affected:test` → `lerna run test --since` (Lerna)  
- `affected:test` → `yarn workspaces foreach --since run test` (Yarn)
- `affected:test` → `npm test` (Standalone - all tests)

**New Commands Needed**:
- `test:package` - Test specific package
- `test:changed` - Test changed packages (any tool)
- `test:scope` - Test with scope/filter
- `scripts:list` - Show available npm scripts
```

### **Phase 2: Enhanced Project Discovery**

#### **2.1 Universal Project Discovery**
```markdown
**Current**: Only finds Nx projects via project.json

**New Approach**: Multi-strategy discovery

**Discovery Strategies**:
1. **Nx Strategy** (existing) - project.json files
2. **Package Strategy** - package.json with name field
3. **Directory Strategy** - apps/, packages/, libs/ folders
4. **Workspace Strategy** - workspace: dependencies
5. **Monorepo Strategy** - multiple package.json detection

**Enhanced Project Info**:
- Project type (app, lib, package, standalone)
- Available scripts (from package.json)
- Dependencies and dependents (if detectable)
- Build/test/lint commands
- Framework detection per project
```

#### **2.2 Intelligent Test Discovery**
```markdown
**Problem**: Test patterns are Nx-specific

**Solution**: Adaptive test file discovery

**Test Pattern Detection**:
- Jest: jest.config.* + **/*.{test,spec}.*
- Vitest: vitest.config.* + **/*.{test,spec}.*  
- Mocha: .mocharc.* + test/**/*.js
- Cypress: cypress.config.* + cypress/**/*
- Playwright: playwright.config.* + tests/**/*

**Enhanced Discovery**:
- Per-package test configuration
- Workspace-level vs package-level testing
- Mixed testing frameworks support
- Test script extraction from package.json
```

### **Phase 3: Adaptive User Experience**

#### **3.1 Project Type Awareness UI**
```markdown
**New Status Bar Elements**:
- Project type indicator: "Nx" | "Turbo" | "Lerna" | "Workspace" | "Standalone"
- Active strategy: "Using turbo for affected tests"
- Quick type switching if ambiguous

**New Welcome Experience**:
- First-time setup wizard
- Project type explanation
- Optimal configuration suggestions
- Framework-specific tips
```

#### **3.2 Contextual Help & Guidance**
```markdown
**Problems Users Face**:
- "Why don't affected tests work?"
- "How do I configure this for my setup?"
- "What commands are available?"

**Solutions**:
- Context-sensitive help tooltips
- Setup guides per project type
- Command availability explanation
- Best practices recommendations
```

#### **3.3 Configuration Simplification**
```markdown
**Current**: Single .aiDebugContext.yml tries to be universal

**New Approach**: Template-based configuration

**Configuration Templates**:
- `nx-workspace.yml` - Optimized for Nx
- `turborepo.yml` - Turborepo patterns
- `lerna.yml` - Lerna patterns  
- `workspace.yml` - Generic workspace
- `standalone.yml` - Single package

**Auto-Generation**:
- Detect project type → suggest optimal template
- One-click configuration setup
- Template switching support
```

### **Phase 4: Advanced Features**

#### **4.1 Tool-Specific Optimizations**
```markdown
**Turborepo Integration**:
- Cache utilization for test results
- Pipeline dependency understanding
- Remote caching support
- Build graph visualization

**Lerna Integration**:
- Version management awareness
- Publication status checking
- Independent vs fixed versioning
- Bootstrap/link status

**Workspace Integration**:
- Dependency hoisting detection
- Workspace protocol understanding
- Cross-package test dependencies
```

#### **4.2 Enhanced Context Generation**
```markdown
**Problem**: Copilot Instructions assume Nx structure

**Solution**: Tool-aware context generation

**Per-Project-Type Context**:
- Nx: Current patterns work well
- Turborepo: Pipeline configs, cache settings, filters
- Lerna: Package interdependencies, version strategies  
- Workspaces: Dependency management, hoisting patterns
- Standalone: Focus on single-package best practices

**Universal Context**:
- Package.json script analysis
- Dependency analysis across all types
- Testing strategy documentation
- Build pipeline documentation
```

---

## 🎯 **Implementation Priority Matrix**

### **Must Have (v3.6.0 Core)**
1. **Project Type Detection** - Foundation for everything else
2. **Adaptive Command Mapping** - Make existing features work
3. **Universal Project Discovery** - Fix project selection
4. **Basic Menu Adaptation** - Remove confusing options

### **Should Have (v3.6.0 Polish)**
1. **Configuration Templates** - Easy setup
2. **Enhanced Test Discovery** - Better test support
3. **Status Bar Indicators** - User awareness
4. **Contextual Help** - Reduce confusion

### **Could Have (v3.6.1+)**
1. **Tool-Specific Optimizations** - Performance gains
2. **Advanced Context Generation** - Better AI context
3. **Project Type Switching** - Power user features
4. **Integration APIs** - Third-party extensions

---

## 🚨 **Risks & Mitigation**

### **High Risk: Breaking Changes**
- **Risk**: Existing Nx users lose functionality
- **Mitigation**: Feature flags, gradual rollout, backwards compatibility

### **Medium Risk: Complexity Explosion**
- **Risk**: Codebase becomes unmaintainable with all project types
- **Mitigation**: Strategy pattern, plugin architecture, clear interfaces

### **Medium Risk: Test Coverage**
- **Risk**: Hard to test all project type combinations
- **Mitigation**: Docker-based test environments, sample project matrix

### **Low Risk: User Confusion**
- **Risk**: Too many options overwhelm users
- **Mitigation**: Smart defaults, progressive disclosure, contextual help

---

## 📊 **Success Metrics**

1. **Adoption**: % of non-Nx workspaces successfully using the extension
2. **User Satisfaction**: Support ticket reduction for "doesn't work" issues
3. **Feature Usage**: Engagement with new project-type-specific features
4. **Performance**: Test execution success rate across project types
5. **Developer Experience**: Time to first successful test run in new project types

---

## 🔄 **Migration Strategy**

### **Existing Users (Nx)**
- Zero breaking changes to current workflows
- Opt-in to new features
- Enhanced Nx-specific optimizations

### **New Users (Non-Nx)**
- Guided onboarding flow
- Automatic optimal configuration
- Clear feature availability communication

### **Mixed Users**
- Per-workspace configuration  
- Easy switching between project types
- Unified experience across different repos

---

## 💡 **Key Insights**

This represents a fundamental shift from "Nx-first with fallbacks" to "Universal workspace support with tool-specific optimizations." The key insight is that we need to stop retrofitting Nx concepts onto non-Nx projects and instead embrace each tool's native patterns and workflows.

### **Design Principles for v3.6.0**
1. **Tool-Native**: Respect each tool's conventions and workflows
2. **Progressive Enhancement**: Start simple, add complexity as needed
3. **Clear Communication**: Always tell users what's happening and why
4. **Graceful Degradation**: Work reasonably well even when detection fails
5. **Zero Breaking Changes**: Existing Nx workflows must continue to work perfectly

---

## 📝 **Next Steps**

1. **Validate Assumptions**: Survey existing users about non-Nx usage
2. **Prototype Detection**: Build project type detection logic
3. **Design Review**: UI/UX review of adaptive menu concepts
4. **Technical Spike**: Assess complexity of command mapping
5. **Timeline Planning**: Break down into implementable milestones