# Beta Installation Guide - AI Context Utilities v3.5.1

**Last Updated**: August 4, 2025  
**Version**: 3.5.1 Beta  
**Status**: Pre-release testing  

---

## 🚀 Install the Beta Extension

### Prerequisites
- **Visual Studio Code**: 1.74.0 or later
- **Node.js**: 16.0 or later (for projects with npm/yarn)
- **Git**: Required for git-based features
- **GitHub Copilot**: Recommended for AI instruction features

### Option 1: Download VSIX (Recommended)
1. **Download the VSIX file** from the latest release
2. **Open VS Code**
3. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
4. **Type**: `Extensions: Install from VSIX...`
5. **Select the downloaded VSIX file**
6. **Restart VS Code** when prompted

### Option 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/your-org/ai-context-util.git
cd ai-context-util

# Install dependencies
npm install

# Build the extension
npm run compile

# Package the extension
npm run package

# Install the generated VSIX
code --install-extension ai-context-util-3.5.1.vsix
```

---

## ✅ Verify Installation

### Check Extension is Active
1. **Open Command Palette** (`Ctrl+Shift+P`)
2. **Type**: `AI Context`
3. **You should see**:
   - `🧪 Open Testing Menu`
   - `🤖 Add Copilot Instruction Contexts`
   - `🍎 Setup`
   - `📊 Show Workspace Info`

### Status Bar Indicator
Look for `⚡ AI Context Util: Ready` in the bottom status bar.

### Test Basic Functionality
1. **Press** `Ctrl+Shift+T` (`Cmd+Shift+T` on Mac)
2. **The test menu should open** with options for your project type
3. **Try** `🍎 Setup` to run the configuration wizard

---

## 🎯 First-Time Setup

### Automatic Setup Wizard
The extension will automatically run setup on first use:

1. **Environment Detection**: Checks for Node.js, npm, git
2. **Project Analysis**: Identifies your project type (Nx, standalone, etc.)
3. **Tool Validation**: Verifies available testing tools
4. **Configuration Creation**: Generates optimal `.aiDebugContext.yml`
5. **Setup Completion**: Confirms everything is working

### Manual Setup (if needed)
If automatic setup fails:

1. **Open Command Palette** (`Ctrl+Shift+P`)
2. **Run**: `AI Context Util: Setup`
3. **Follow the wizard prompts**
4. **Check output panel** for detailed progress

---

## 🧪 Test the Installation

### Quick Test: Run Tests
1. **Press** `Ctrl+Shift+T` to open test menu
2. **Select a test option** based on your project:
   - **Nx Projects**: Try "Test Affected"
   - **Standalone Projects**: Try "Run Tests"
   - **Any Project**: Try "Git Context: Test Changed Files"

### Generate Copilot Instructions
1. **Open Command Palette** (`Ctrl+Shift+P`)
2. **Run**: `AI Context Util: Add Copilot Instruction Contexts`
3. **Check** `.github/instructions/` folder for generated files

### View Workspace Information
1. **Open Command Palette** (`Ctrl+Shift+P`)
2. **Run**: `AI Context Util: Show Workspace Info`
3. **Review** detected project structure and configuration

---

## 🐛 Report Issues & Provide Feedback

### 🚨 Bug Reports
Found a bug? Help us improve the extension!

**GitHub Issues**: [Create New Issue](https://github.com/your-org/ai-context-util/issues/new)

**Include This Information**:
```
**Extension Version**: 3.5.1
**VS Code Version**: [from Help > About]
**Operating System**: [Windows/Mac/Linux]
**Project Type**: [Nx/Standalone/Turborepo/etc.]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Error Messages**:
[Copy any error messages from VS Code output panel]

**Project Structure** (if relevant):
```
my-project/
├── package.json
├── nx.json (if applicable)
└── src/
```

**Additional Context**:
[Screenshots, logs, or other helpful information]
```

### 💡 Feature Requests
Have an idea for improvement?

**GitHub Discussions**: [Start a Discussion](https://github.com/your-org/ai-context-util/discussions)

**Feature Request Template**:
```
**Is your feature request related to a problem?**
[Describe the problem you're trying to solve]

**Describe the solution you'd like**
[Clear description of what you want to happen]

**Describe alternatives you've considered**
[Other solutions or workarounds you've tried]

**Additional context**
[Screenshots, mockups, or examples]

**Project Context**
- Project type: [Nx/Standalone/etc.]
- Team size: [Individual/Small team/Large team]
- Use case: [Testing/Documentation/AI integration/etc.]
```

### 🗣️ General Feedback
**Options for Feedback**:
- **GitHub Discussions**: General questions and feedback
- **Email**: [beta-feedback@yourorg.com](mailto:beta-feedback@yourorg.com)
- **Discord/Slack**: [Community invite link]

**Helpful Feedback Topics**:
- User experience and interface
- Performance and speed
- Feature usefulness and adoption
- Documentation clarity
- Integration with existing workflows

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Extension Not Loading
```
Problem: Extension appears in list but commands don't work
Solution: 
1. Restart VS Code completely
2. Check VS Code output panel for errors
3. Verify Node.js is installed and accessible
```

#### Test Menu Shows "No Projects Found"
```
Problem: Test menu shows no available projects
Solution:
1. Ensure you're in a valid project directory
2. Check that package.json exists
3. Run "AI Context Util: Setup" to reconfigure
4. Check output panel for project discovery errors
```

#### Nx Commands Not Working
```
Problem: "Nx not available" notifications
Solution:
1. This is expected behavior if Nx isn't installed
2. Extension automatically falls back to npm scripts
3. Install Nx if you want affected test functionality
4. Check that nx.json exists in project root
```

#### Copilot Instructions Generation Fails
```
Problem: Instruction generation throws errors
Solution:
1. Check that .github directory can be created
2. Verify file permissions in workspace
3. Check output panel for detailed error messages
4. Try running with "AI Context Util: Setup" first
```

#### Performance Issues
```
Problem: Extension is slow or unresponsive
Solution:
1. Check project size (very large projects may be slower)
2. Clear VS Code cache and restart
3. Check available system memory
4. Report performance issues with project details
```

### Getting Help

#### Debug Information
To get debug information for support:

1. **Open Output Panel**: `View` > `Output`
2. **Select**: "AI Context Util" from dropdown
3. **Copy recent logs** when reporting issues

#### Enable Verbose Logging
Add to VS Code settings.json:
```json
{
  "aiDebugContext.output.verbose": true,
  "aiDebugContext.enableFileWatcher": true
}
```

#### Reset Extension State
If extension gets into bad state:
1. **Disable** the extension
2. **Restart** VS Code
3. **Re-enable** the extension
4. **Run setup** again

---

## 🔄 Updates & Releases

### Beta Update Process
1. **New beta releases** will be announced via GitHub releases
2. **Download new VSIX** and install following same process
3. **Existing configuration** will be preserved
4. **Check changelog** for breaking changes

### Migration to Release Version
When the extension becomes available on VS Code Marketplace:
1. **Uninstall beta version** via Extensions panel
2. **Install release version** from Marketplace
3. **Configuration will be preserved** automatically

### Stay Informed
- **Watch GitHub repository** for updates
- **Join discussion channels** for announcements
- **Follow changelog** for feature updates

---

## 📚 Next Steps

### After Installation
1. **Read** [Quick Start Guide](QUICK_START_GUIDE.md) for basic usage
2. **Review** [Full User Guide](FULL_USER_GUIDE.md) for comprehensive features
3. **Explore** generated Copilot instructions in `.github/instructions/`
4. **Customize** user overrides for your team's needs

### Learning Resources
- **Technical Documentation**: [TECHNICAL_SPECIFICATIONS.md](../TECHNICAL_SPECIFICATIONS.md)
- **UI Reference**: [UI_SPECIFICATIONS_v3_5_1.md](../UI_SPECIFICATIONS_v3_5_1.md)
- **Example Projects**: [GitHub examples repository]
- **Video Tutorials**: [YouTube playlist link]

### Community
- **GitHub Discussions**: Ask questions and share tips
- **Discord/Slack**: Real-time community support
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) to help improve the extension

---

## 🎯 Beta Testing Goals

### What We're Testing
- **Universal project support** across different architectures
- **Workspace-specific functionality** with multiple workspaces
- **Fallback behavior** when tools are unavailable
- **User experience** for first-time setup and daily usage
- **Performance** with various project sizes and types

### What Feedback Helps Most
- **Real-world usage scenarios** and workflow integration
- **Edge cases** and unusual project setups
- **Performance characteristics** with your specific projects
- **UI/UX feedback** on discoverability and ease of use
- **Feature gaps** or missing functionality

### Beta Testing Rewards
- **Early access** to new features
- **Direct influence** on feature development
- **Recognition** in release notes and documentation
- **Beta tester badge** in community channels

---

**Thank you for beta testing AI Context Utilities! Your feedback helps make the extension better for everyone.**

*Need immediate help? Check our [FAQ](FAQ.md) or reach out via [GitHub Issues](https://github.com/your-org/ai-context-util/issues).*