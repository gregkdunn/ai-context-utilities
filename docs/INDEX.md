# AI Debug Context V3.4.0 Documentation

## 📚 Current Documentation

### Core Documentation
- **[README.md](../README.md)** - Main project documentation
- **[Context Examples](REAL_CONTEXT_EXAMPLES.md)** - Actual context file output examples

### User Guides
- **[Installation Guide](guides/INSTALLATION_GUIDE.md)** - How to install and use the extension
- **[Quick Start Guide](guides/QUICK_START_GUIDE.md)** - Get started quickly
- **[Development Guide](guides/DEVELOPMENT.md)** - Development setup and workflow
- **[Contributing Guide](guides/CONTRIBUTING.md)** - How to contribute to the project
- **[Developer Guide](guides/DEVELOPER.md)** - Advanced development topics

## 🎯 Key Features (V3.4.0)

### Context Generation
- Complete relevant information without arbitrary limits
- Context-aware prompts for failing vs passing tests
- Output format specifications for consistent AI responses

### Feature Flag Detection
- Supports 10+ feature flag systems (FlipperService, LaunchDarkly, generic patterns)
- Automatic QA checklist generation in PR descriptions
- Pattern-based detection in git diffs

### Test Analysis
- Specific error categorization (TypeError, AssertionError, etc.)
- Concrete fix suggestions with file paths and line numbers
- Context extraction from test failures

### PR Descriptions
- Analysis of actual git changes instead of templates
- Breaking change detection and migration guidance
- Feature flag integration with testing instructions

## 📋 Context Files Generated

**Location:** `.github/instructions/ai-utilities-context/`

- **`ai-debug-context.txt`** - Test context for debugging or code review
- **`pr-description.txt`** - PR descriptions based on git analysis
- **`test-output.txt`** - Raw test execution output
- **`diff.txt`** - Git changes

## 🚀 Quick Links

- **New Users**: Start with [Installation Guide](guides/INSTALLATION_GUIDE.md)
- **Contributors**: See [Contributing Guide](guides/CONTRIBUTING.md)
- **Examples**: Check [Context Examples](REAL_CONTEXT_EXAMPLES.md) for output samples

---

**Documentation Principle:** Realistic feature-focused content without marketing fluff.