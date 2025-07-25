# AI Debug Context V3 - Intelligent Test Runner for VSCode

## 🎯 **Mission**: Transform your testing workflow from minutes to seconds

**Current Phase:** 1.9 - Feature Complete with Unified UI ✅  
**Status:** Production Ready  
**Architecture:** Clean, modular, dependency injection

---

## ⚡ **Key Features**

### 🎨 **Unified Test Menu**
- **Single Interface** - Type project name OR select from visual buttons
- **Smart Suggestions** - Shows available projects as you type
- **Recent History** - Quick access to last 5 tested projects with timestamps
- **Color Icons** - Visual clarity with meaningful icons

### 🚀 **Test Execution Modes**
- **Test Affected Projects** - Auto-detects all projects affected by your changes
- **Test Updated Files** - Runs only tests for modified files (fastest option)
- **Select Project** - Browse all projects with recent ones at top
- **Direct Entry** - Type any project name to test immediately

### 📊 **Smart Features**
- **Legacy-Style Output** - Beautiful, structured test reports
- **Real-time Progress** - Animated indicators show tests as they run
- **Nx Cloud Integration** - Clickable links to cloud test results
- **Error Recovery** - Failed tests offer: Re-run Failed, Re-run All, Debug options
- **Output History** - All test runs preserved with timestamps

---

## 🚀 **Quick Start**

### 1. **Installation**
```bash
# Install from VSCode marketplace
ext install ai-debug-context-v3

# Or install from VSIX
code --install-extension ai-debug-context-v3.vsix
```

### 2. **Usage - Just Click!**
Click the **"⚡ AI Debug Context: Ready"** status bar item

### 3. **Choose Your Testing Style**
```
🧪 AI Debug Context - Test Runner

Type project name or select an option below:
┌─────────────────────────────────────────────┐
│ [Type to filter or enter project name...]   │
├─────────────────────────────────────────────┤
│ ⚡ Test Affected Projects         Smart     │
│ 🔀 Test Updated Files            Focused   │  
│ 📚 Select Project                Browse    │
│ ─────────────────────────────────────────── │
│ ▶️  Run Recent: my-last-project  Most Recent│
│ 🕐 another-project               Recent 2  │
└─────────────────────────────────────────────┘
```

---

## 🎮 **Available Commands**

Access all commands via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

### **Primary Commands**
- **⚡ Run My Changed Tests** - Opens unified test menu (or click status bar)
- **🎯 Test Specific Project** - Direct access to project selector
- **👀 Toggle Test Watcher** - Start/stop real-time file watching
- **📋 Run Manual Project** - Quick access to manual project entry

### **Project Management** 
- **📊 Show Workspace Info** - Display project count and workspace details
- **🗑️ Clear Test Cache** - Reset project discovery cache
- **🍎 Run Setup** - Launch the setup wizard

### **Advanced Options**
- **⚡ Run Tests (Skip Analysis)** - Quick test run without detailed analysis
- **🚀 Auto-Detect Projects** - Find projects from git changes
- **🎯 Type Project Name** - Manually specify a project to test

---

## 🏗️ **Architecture** (Phase 1.8)

This extension features a **clean, modern architecture**:

```typescript
// Clean 79-line main extension file (was 1,360 lines!)
extension.ts          // ✅ Minimal activation logic
├── ServiceContainer  // ✅ Dependency injection
├── CommandRegistry   // ✅ Centralized commands  
└── ProjectDiscovery  // ✅ Fast file-based discovery
```

### **Key Improvements**
- **94% code reduction** in main extension file
- **Zero global variables** - proper dependency injection
- **Modular design** - each service has single responsibility  
- **178 passing tests** - comprehensive test coverage
- **TypeScript strict mode** - type safety throughout

---

## 🔧 **Supported Project Types**

- **✅ Git Repositories** - Any project using git version control
- **✅ Node.js Projects** - JavaScript/TypeScript with package.json
- **✅ Nx Workspaces** - Monorepo support with project.json files
- **✅ Multi-folder Workspaces** - VSCode workspaces with multiple roots
- **✅ Custom Test Setups** - Configurable via setup wizard

---

## 🚦 **Status Indicators**

Watch the status bar for real-time feedback:

- **⚡ AI Debug Context: Ready** - Click to open test menu
- **🚀 Auto-detecting...** - Finding projects from changed files
- **📝 Testing updated files...** - Running git affected tests
- **✅ Tests passed** - All tests successful
- **❌ Tests failed** - Some tests need attention
- **👁️ Watching files** - File watcher active

## 📊 **Test Output Format**

Experience beautifully formatted test results:

```
================================================================================
🧪 [2:45:15 PM] TESTING: MY-PROJECT
🧪 Running: npx nx test my-project --verbose
================================================================================

   ⠋ Running tests...
   ✅ auth.service.spec.ts
   ✅ user.controller.spec.ts
   ❌ payment.service.spec.ts
   
══════════════════════════════════════════════════════════════════════
📋 TEST ANALYSIS REPORT
══════════════════════════════════════════════════════════════════════

📊 EXECUTIVE SUMMARY
───────────────────
Status: FAILED ❌
Total: 45 | Passed: 44 | Failed: 1 | Skipped: 0
Duration: 3.2s

🔍 FAILURE ANALYSIS
─────────────────
✗ PaymentService › should process refunds correctly
  Expected: 100
  Received: undefined
  
  at payment.service.spec.ts:45:16
```

---

## 🛠️ **Configuration**

### **Automatic Setup**
Run `AI Debug: Run Setup` for guided configuration

### **Manual Configuration**
```json
{
  "aiDebugContext.recentProjects": [],
  "aiDebugContext.projectCache": {}
}
```

---

## 🔄 **Typical Workflow**

1. **Make code changes** in your project
2. **Run changed tests**: `AI Debug: Run My Changed Tests`
3. **Watch real-time**: Enable `AI Debug: Toggle Test Watcher`
4. **Fix issues** based on test feedback
5. **Clear cache** if needed: `AI Debug: Clear Test Cache`

---

## 🧪 **Shell Script Foundation**

The extension uses battle-tested shell scripts:

```bash
scripts/
├── ai-debug-affected-tests    # Smart test detection
├── ai-debug-parallel-tests    # Parallel execution
├── ai-debug-watch            # File watching
└── ai-debug-nx-affected-tests # Nx workspace support
```

These scripts work independently and can be used outside VSCode!

---

## 🐛 **Troubleshooting**

### **Extension Not Loading**
1. Check `View > Output > AI Debug Context` for errors
2. Restart VSCode completely
3. Run `AI Debug: Run Setup` to reconfigure

### **Commands Not Appearing**
1. Open Command Palette (`Cmd+Shift+P`)
2. Type "AI Debug" - should see 9 commands
3. If missing, reinstall extension

### **Shell Script Errors**
1. Ensure scripts are executable: `chmod +x scripts/ai-debug-*`
2. Check script permissions in `scripts/` directory
3. Run setup wizard: `AI Debug: Run Setup`

### **Project Detection Issues**
1. Clear cache: `AI Debug: Clear Test Cache`
2. Ensure workspace folder is open
3. Check git repository status

---

## 📊 **Performance**

**Before AI Debug Context:**
- Test-fix-test cycle: 60-120 seconds
- Running all tests: 5-10 minutes
- Finding failing tests: Manual process

**After AI Debug Context:**
- Test-fix-test cycle: <10 seconds ⚡
- Running affected tests: 10-30 seconds 🚀
- Auto-detection: Instant 🎯

---

## 🎯 **Phase 1.8 Achievement**

✅ **Clean Architecture Complete**
- ServiceContainer pattern for dependency injection
- CommandRegistry for centralized command management
- SimpleProjectDiscovery for fast project detection
- Zero global variables, proper error handling
- 94% reduction in extension.ts complexity

**Next:** Phase 1.9 - Repository cleanup and optimization

---

## 🤝 **Contributing**

This extension follows strict quality standards:
- **95% test coverage** required
- **TypeScript strict mode** enforced  
- **Modular architecture** maintained
- **Shell script compatibility** preserved

---

## 📝 **License**

MIT License - See LICENSE file for details

---

**Version:** 3.0.0  
**Phase:** 1.8 - Clean Architecture  
**Build:** Production Ready ✅