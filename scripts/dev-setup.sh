#!/bin/bash

# AI Debug Context V3 - Development Setup Script
# One-command development environment setup

set -e

echo "🚀 AI Debug Context V3 - Development Setup"
echo "================================================="

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required but not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is required but not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js 18+ is required (found v$NODE_VERSION)"
        exit 1
    fi
    
    echo "✅ Prerequisites met (Node.js $(node --version))"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
}

# Compile TypeScript
compile_typescript() {
    echo "🔨 Compiling TypeScript..."
    npm run compile
    echo "✅ TypeScript compiled successfully"
}

# Run tests
run_tests() {
    echo "🧪 Running tests..."
    npm test -- --passWithNoTests
    echo "✅ Tests completed"
}

# Create test workspace
create_test_workspace() {
    echo "🏗️ Creating test workspace..."
    
    TEST_WORKSPACE=".dev-workspace"
    mkdir -p "$TEST_WORKSPACE"
    
    # Copy test fixtures
    if [ -d "tests/fixtures/sample-projects" ]; then
        cp -r tests/fixtures/sample-projects/* "$TEST_WORKSPACE/"
        echo "✅ Test projects copied to $TEST_WORKSPACE"
    else
        echo "⚠️ Test fixtures not found, creating minimal workspace"
        mkdir -p "$TEST_WORKSPACE/test-project"
        cat > "$TEST_WORKSPACE/test-project/package.json" << 'EOF'
{
  "name": "test-project",
  "version": "1.0.0",
  "scripts": {
    "test": "echo \"No tests specified\""
  }
}
EOF
    fi
}

# Generate launch configuration
generate_launch_config() {
    echo "🔧 Generating VS Code launch configuration..."
    
    mkdir -p .vscode
    cat > .vscode/launch.json << 'EOF'
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Run Extension",
            "type": "extensionHost",
            "request": "launch",
            "args": [
                "--extensionDevelopmentPath=${workspaceFolder}",
                "${workspaceFolder}/.dev-workspace"
            ],
            "outFiles": [
                "${workspaceFolder}/out/**/*.js"
            ],
            "preLaunchTask": "${workspaceFolder}/npm: compile"
        },
        {
            "name": "Extension Tests",
            "type": "extensionHost", 
            "request": "launch",
            "args": [
                "--extensionDevelopmentPath=${workspaceFolder}",
                "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
            ],
            "outFiles": [
                "${workspaceFolder}/out/test/**/*.js"
            ],
            "preLaunchTask": "${workspaceFolder}/npm: compile"
        }
    ]
}
EOF
    echo "✅ Launch configuration created"
}

# Generate tasks configuration
generate_tasks_config() {
    echo "⚙️ Generating VS Code tasks configuration..."
    
    cat > .vscode/tasks.json << 'EOF'
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "npm",
            "script": "compile",
            "group": "build",
            "presentation": {
                "reveal": "silent"
            },
            "problemMatcher": "$tsc"
        },
        {
            "type": "npm", 
            "script": "watch",
            "group": "build",
            "isBackground": true,
            "presentation": {
                "reveal": "never"
            },
            "problemMatcher": "$tsc-watch"
        },
        {
            "label": "Run Tests",
            "type": "shell",
            "command": "npm test",
            "group": "test",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared"
            }
        }
    ]
}
EOF
    echo "✅ Tasks configuration created"
}

# Create development scripts
create_dev_scripts() {
    echo "📜 Creating development scripts..."
    
    # Quick test script
    cat > scripts/quick-test.sh << 'EOF'
#!/bin/bash
echo "🧪 Running quick tests..."
npm test -- --testPathPattern="SmartFrameworkDetector|ConfigurationManager" --passWithNoTests
EOF
    
    # Performance benchmark script
    cat > scripts/benchmark.sh << 'EOF'
#!/bin/bash
echo "📊 Running performance benchmarks..."
node -e "
const { PerformanceMonitor } = require('./out/utils/PerformanceMonitor');
const monitor = new PerformanceMonitor({ appendLine: console.log });

async function benchmark() {
    console.log('Running performance tests...');
    
    // Simulate operations
    for (let i = 0; i < 10; i++) {
        await monitor.trackCommand('test-operation', async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        });
    }
    
    monitor.displayReport();
}

benchmark().catch(console.error);
"
EOF
    
    # Make scripts executable
    chmod +x scripts/*.sh
    echo "✅ Development scripts created"
}

# Display completion message
show_completion() {
    echo ""
    echo "🎉 Development setup complete!"
    echo "================================"
    echo ""
    echo "📁 Test workspace: .dev-workspace/"
    echo "🔧 VS Code configs: .vscode/"
    echo "📜 Dev scripts: scripts/"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Open this folder in VS Code"
    echo "   2. Press F5 to launch extension in debug mode"
    echo "   3. Use Ctrl+Shift+P and type 'AI Debug Context'"
    echo "   4. Run 'npm run dev' for watch mode"
    echo ""
    echo "🧪 Quick commands:"
    echo "   npm test           # Run all tests"
    echo "   npm run compile    # Compile TypeScript"
    echo "   npm run watch      # Watch mode"
    echo "   ./scripts/quick-test.sh  # Run key tests"
    echo ""
}

# Main execution
main() {
    check_prerequisites
    install_dependencies
    compile_typescript
    run_tests
    create_test_workspace
    generate_launch_config
    generate_tasks_config
    create_dev_scripts
    show_completion
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi