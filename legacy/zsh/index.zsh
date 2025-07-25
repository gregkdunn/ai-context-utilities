# =========================================================================
# AI Debug Utilities for NX Projects - Index File
# =========================================================================
# Purpose: Main entry point for loading all AI debugging utility functions
# Usage: Source this file in your .zshrc to add all functions to your shell
# =========================================================================

# Set base directory for all AI utilities output
export AI_UTILITIES_BASE_DIR="${AI_UTILITIES_BASE_DIR:-.github/instructions/ai_utilities_context}"

# Get the directory where this script is located
local AI_UTILITIES_DIR="${0:A:h}"

# Source all function files
source "$AI_UTILITIES_DIR/functions/nxTest.zsh"
source "$AI_UTILITIES_DIR/functions/gitDiff.zsh"
source "$AI_UTILITIES_DIR/functions/prepareToPush.zsh"
source "$AI_UTILITIES_DIR/functions/aiDebug.zsh"

# Display loaded functions (optional - remove if you don't want startup messages)
echo "🤖 AI Debug Utilities loaded:"
echo "  • aiDebug       - Complete development workflow (tests + lint + format + PR prompts)"
echo "  • prepareToPush - Code quality validation (lint + format)"
echo "  • nxTest        - AI-optimized test reporting"
echo "  • gitDiff       - Smart git change analysis"
echo ""
echo "📁 Output directory: $AI_UTILITIES_BASE_DIR"
echo ""
echo "💡 Quick start: aiDebug <project-name>"