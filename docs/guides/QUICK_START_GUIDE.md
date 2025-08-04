# Quick Start Guide - AI Context Utilities v3.5.1

**Last Updated**: August 4, 2025  
**Version**: 3.5.1  
**Estimated Time**: 5-10 minutes

---

## 🚀 Get Started in 3 Steps

### Step 1: Generate Copilot Instructions (2 minutes)
1. **Open your project** in VS Code
2. **Press** `Ctrl+Shift+P` (`Cmd+Shift+P` on Mac)
3. **Type**: `copilot` and select `🤖 Add Copilot Instruction Contexts`
4. **Wait** for analysis to complete (30-60 seconds)
5. **Success!** Check `.github/instructions/` folder for generated files

### Step 2: Run Your First Test (1 minute)
1. **Press** `Ctrl+Shift+T` (`Cmd+Shift+T` on Mac)
2. **Select** an option from the test menu:
   - **Nx projects**: Choose `🎯 Test Affected`
   - **Other projects**: Choose `🚀 Run Tests`
3. **Watch** real-time test output in the VS Code terminal
4. **Done!** Your test results are now available

### Step 3: Customize for Your Team (2 minutes)
1. **Open** `.github/instructions/user-overrides.instructions.md`
2. **Add your team's preferences** in the provided template
3. **Save** the file - changes take effect immediately
4. **Your overrides** now have highest priority (1000) in Copilot context

---

## 🎯 What You Just Accomplished

### ✅ Generated AI Instructions
Your project now has comprehensive GitHub Copilot instructions that include:
- **Framework-specific guidance** (Angular, React, Vue, TypeScript)
- **ESLint rules translated** to natural language
- **Prettier formatting preferences** documented
- **Team overrides** with highest priority

### ✅ Set Up Intelligent Testing
The extension is now configured to:
- **Auto-detect your project type** (Nx, standalone, workspace, etc.)
- **Run appropriate test commands** for your architecture
- **Track recent test projects** per workspace
- **Provide real-time feedback** during test execution

### ✅ Enabled Workspace Isolation
Each workspace now maintains:
- **Separate recent project history**
- **Workspace-specific configurations**
- **Isolated test results and context**

---

## 🧪 Try These Common Workflows

### Testing Workflows

#### Quick Test Run
```
Press: Ctrl+Shift+T
Select: First option (Recent project or Run Tests)
Result: Tests execute with real-time output
```

#### Test Changed Files Only
```
Press: Ctrl+Shift+T
Select: 🎯 Git Context: Test Changed Files
Result: Only tests related to git changes run
```

#### Re-run Last Test
```
Press: Ctrl+Shift+T
Select: 🔄 Re-run Last Test
Result: Previous test runs again instantly
```

### Copilot Integration

#### Use Generated Instructions
1. **Open any code file** in your project
2. **Start GitHub Copilot Chat**
3. **Type**: `@workspace explain this component following project guidelines`
4. **Copilot uses your instructions** automatically for context-aware responses

#### Customize Team Rules
1. **Edit** `user-overrides.instructions.md`
2. **Add specific patterns** your team prefers:
   ```markdown
   ## Team Preferences
   ✅ Use React functional components with hooks
   ❌ Avoid class components in new code
   ✅ Prefer TypeScript strict mode
   ```
3. **Save** - Copilot now follows your team's rules

### Project Analysis

#### View Project Information
```
Press: Ctrl+Shift+P
Type: workspace info
Select: 📊 Show Workspace Info
Result: Detailed project analysis and statistics
```

#### Check Configuration
```
Press: Ctrl+Shift+P
Type: setup
Select: 🍎 Setup
Result: Runs configuration wizard and validation
```

---

## 🔍 Understanding Your Generated Files

### Main Entry Point
**File**: `.github/instructions/copilot-instructions.md`
```markdown
# GitHub Copilot Instructions

This is a [Project Type] project with [Test Framework].

## Specialized Instructions
- [User Overrides & Team Decisions](./user-overrides.instructions.md) (Priority: 1000)
- [Framework Guidelines](./frameworks/angular.instructions.md) (Priority: 100)
- [ESLint Rules](./frameworks/eslint-rules.instructions.md) (Priority: 30)
```
**Purpose**: Single file that links to all your project's AI instructions

### Team Customizations
**File**: `.github/instructions/user-overrides.instructions.md`
```markdown
# User Override Instructions

## Project-Specific & Override Rules
### Angular (Overrides & Additions)
- **Do NOT use explicit `standalone: true`** (implied by default)
- **Use `trackBy` with `*ngFor`** to optimize rendering
```
**Purpose**: Your team's highest-priority rules that override everything else

### Framework-Specific Files
**Location**: `.github/instructions/frameworks/`
- `angular.instructions.md` - Angular patterns and best practices
- `typescript.instructions.md` - TypeScript guidelines
- `eslint-rules.instructions.md` - ESLint rules in natural language
- `prettier-formatting.instructions.md` - Code formatting preferences

---

## ⚡ Pro Tips for Power Users

### Keyboard Shortcuts
- **`Ctrl+Shift+T`**: Open test menu (most used command)
- **`Ctrl+Shift+G`**: Quick git context tests
- **`Ctrl+Shift+R`**: Re-run last test

### Status Bar Shortcuts
- **Click** the status bar `⚡ AI Context Util: Ready` to open test menu
- **Status colors**: Green = success, Yellow = running, Red = error

### Command Palette Power
Type these partial commands for quick access:
- `test` → Test-related commands
- `copilot` → AI instruction commands  
- `setup` → Configuration commands
- `workspace` → Project analysis commands

### Multiple Workspaces
The extension automatically:
- **Isolates recent projects** per workspace
- **Maintains separate configurations** if needed
- **Switches context** when you change workspaces
- **Preserves history** for each workspace independently

---

## 🐛 Quick Troubleshooting

### "No Projects Found"
**Problem**: Test menu shows no projects
**Quick Fix**: Ensure you have a `package.json` file in your workspace root

### "Nx Not Available" Notification
**Problem**: Extension says Nx isn't available
**Quick Fix**: This is normal! Extension automatically uses npm scripts instead

### Tests Not Running
**Problem**: Test command fails
**Quick Fix**: 
1. Check that `npm test` works in terminal
2. Run `🍎 Setup` to reconfigure
3. Check VS Code output panel for errors

### Generated Files Missing
**Problem**: No files in `.github/instructions/`  
**Quick Fix**:
1. Check file permissions in workspace
2. Ensure `.github` directory can be created
3. Try running Copilot Instructions command again

---

## 🎓 Next Steps

### Learn More Features
- **[Full User Guide](FULL_USER_GUIDE.md)**: Complete feature walkthrough
- **[Technical Specs](../TECHNICAL_SPECIFICATIONS.md)**: Deep technical details
- **[UI Reference](../UI_SPECIFICATIONS_v3_5_1.md)**: Interface documentation

### Advanced Usage
- **Team Configuration**: Share configurations across team members
- **Custom Templates**: Create project-specific instruction templates
- **Performance Tuning**: Optimize for large projects and monorepos
- **Integration**: Connect with CI/CD and other development tools

### Community & Support
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share tips
- **Contributing**: Help improve the extension

### Stay Updated
- **Watch GitHub repository** for new releases
- **Check changelog** for feature updates
- **Join community channels** for announcements

---

## 📊 What's Working Well?

After following this guide, you should have:
- ✅ **Generated Copilot instructions** tailored to your project
- ✅ **Working test execution** with appropriate commands for your project type
- ✅ **Customizable team overrides** with highest priority
- ✅ **Workspace-specific context** that adapts when you switch projects
- ✅ **Real-time feedback** during development workflows

### Validation Checklist
- [ ] Test menu opens with `Ctrl+Shift+T`
- [ ] Copilot instructions exist in `.github/instructions/`
- [ ] Status bar shows `⚡ AI Context Util: Ready`
- [ ] Tests run successfully from the menu
- [ ] User overrides file is editable and customizable

---

## 🎯 You're Ready!

You've successfully set up AI Context Utilities! The extension is now:
- **Analyzing your project** automatically
- **Generating smart AI context** for better Copilot responses
- **Running tests efficiently** based on your project architecture
- **Learning your team's preferences** through user overrides

**Happy coding with enhanced AI assistance!** 🚀

---

*Need more help? Check the [Full User Guide](FULL_USER_GUIDE.md) for comprehensive documentation, or visit our [GitHub repository](https://github.com/your-org/ai-context-util) for support.*