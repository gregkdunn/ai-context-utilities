# =========================================================================
# File: functions/prepareToPush.zsh
# Purpose: Code quality validation before committing changes
# =========================================================================

# =========================================================================
# FUNCTION: prepareToPush
# =========================================================================
# Purpose: Runs linting and formatting on a given NX project to ensure 
#          code quality before pushing changes.
#
# Usage:
#   prepareToPush <project-name>
#
# Examples:
#   prepareToPush settings-voice-assist-feature    # Lint and format specific project
#   prepareToPush my-lib                          # Lint and format my-lib
#
# What it does:
#   1. Runs yarn nx lint [project] to check for linting errors
#   2. If linting passes, runs yarn nx prettier [project] --write to format code
#   3. Returns appropriate exit codes for CI/scripting
#
# Notes:
#   - Both commands must pass for the function to succeed
#   - Prettier automatically fixes formatting issues
#   - Use this before committing or creating PRs
#   - Integrates well with aiDebug workflow
# =========================================================================

prepareToPush() {
  local project="$1"
  
  if [[ -z "$project" ]]; then
    echo "❌ Error: Project name is required"
    echo "Usage: prepareToPush <project-name>"
    echo "Example: prepareToPush settings-voice-assist-feature"
    return 1
  fi
  
  echo "=========================================================="
  echo "🚀 Preparing to Push: $project"
  echo "=========================================================="
  
  # Step 1: Run linting
  echo ""
  echo "🔍 Running linter..."
  echo "Command: yarn nx lint $project"
  
  if yarn nx lint "$project"; then
    echo "✅ Linting passed!"
  else
    local lint_exit_code=$?
    echo "❌ Linting failed with exit code: $lint_exit_code"
    echo ""
    echo "💡 NEXT STEPS:"
    echo "• Fix the linting errors shown above"
    echo "• Some errors may be auto-fixable with: yarn nx lint $project --fix"
    echo "• Re-run prepareToPush $project after fixes"
    return $lint_exit_code
  fi
  
  # Step 2: Run prettier formatting
  echo ""
  echo "✨ Running code formatter..."
  echo "Command: yarn nx prettier $project --write"
  
  if yarn nx prettier "$project" --write; then
    echo "✅ Code formatting completed!"
  else
    local prettier_exit_code=$?
    echo "❌ Prettier failed with exit code: $prettier_exit_code"
    echo ""
    echo "💡 NEXT STEPS:"
    echo "• Check the prettier errors shown above"
    echo "• Ensure all files are valid syntax"
    echo "• Re-run prepareToPush $project after fixes"
    return $prettier_exit_code
  fi
  
  # Success summary
  echo ""
  echo "=========================================================="
  echo "🎉 Ready to Push!"
  echo "=========================================================="
  echo "✅ Linting: Passed"
  echo "✅ Formatting: Applied"
  echo ""
  echo "📋 SUGGESTED NEXT STEPS:"
  echo "1. Review any formatting changes made by prettier"
  echo "2. Run aiDebug $project to ensure tests still pass"
  echo "3. Commit your changes: git add . && git commit -m 'Your message'"
  echo "4. Push to your branch: git push"
  echo ""
  echo "🔄 COMPLETE WORKFLOW:"
  echo "• prepareToPush $project  (✅ Done!)"
  echo "• aiDebug $project        (recommended next)"
  echo "• git commit && git push  (final step)"
  echo "=========================================================="
  
  return 0
}