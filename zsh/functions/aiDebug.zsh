# =========================================================================
# File: functions/aiDebug.zsh
# Purpose: AI Context debugging with automatic quality checks and PR prompts
# =========================================================================

# =========================================================================
# FUNCTION: aiDebug (AI Context with Integrated Quality Checks)
# =========================================================================
# Purpose: Creates an AI Context context file for debugging test failures
#          by intelligently combining git changes with test results and
#          providing structured analysis guidance. Automatically runs code
#          quality checks and generates PR descriptions when tests pass.
#
# Usage:
#   aiDebug [options] [test-target]
#
# Options:
#   --quick              Skip detailed analysis, faster execution
#   --full-context       Include full test output (not AI Context)
#   --no-diff           Skip git diff capture
#   --focus <area>      Focus on specific area (tests|types|performance)
#
# Examples:
#   aiDebug settings-voice-assist-feature     # Full AI Context analysis
#   aiDebug --quick my-component             # Quick analysis
#   aiDebug --focus=types my-service         # Focus on TypeScript issues
#   aiDebug --full-context complex-feature  # Include verbose test output
#
# Output Files:
#   - .github/instructions/ai-utilities-context/ai-debug-context.txt (main AI context file)
#   - .github/instructions/ai-utilities-context/pr-description-prompt.txt (PR description prompts)
#   - .github/instructions/ai-utilities-context/diff.txt (git changes)
#   - .github/instructions/ai-utilities-context/jest-output.txt (test results)
#
# AI context Features:
#   - Intelligent context prioritization
#   - Failure correlation analysis
#   - Change impact assessment
#   - Structured debugging guidance
#   - Automatic code quality checks when tests pass
#   - PR description generation when ready
#   - Optimized file size for AI processing
#
# =========================================================================

aiDebug() {
  local test_target=""
  local quick_mode=0
  local full_context=0
  local skip_diff=0
  local focus_area=""
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --quick)
        quick_mode=1
        shift
        ;;
      --full-context)
        full_context=1
        shift
        ;;
      --no-diff)
        skip_diff=1
        shift
        ;;
      --focus)
        if [[ -n "$2" ]]; then
          focus_area="$2"
          shift 2
        else
          echo "❌ Error: --focus requires an area (tests|types|performance)"
          return 1
        fi
        ;;
      --focus=*)
        focus_area="${1#--focus=}"
        shift
        ;;
      -*)
        echo "❌ Unknown option: $1"
        echo "Usage: aiDebug [--quick] [--full-context] [--no-diff] [--focus=area] [test-target]"
        return 1
        ;;
      *)
        test_target="$1"
        shift
        ;;
    esac
  done

  # Configuration
  local base_dir="$AI_UTILITIES_BASE_DIR"
  local context_file="$base_dir/ai-debug-context.txt"
  local pr_description_file="$base_dir/pr-description-prompt.txt"
  local diff_file="$base_dir/diff.txt"
  local test_file="$base_dir/jest-output.txt"
  
  # Ensure directories exist and clean up previous runs
  mkdir -p "$base_dir"
  rm -f "$context_file" "$diff_file" "$test_file" "$pr_description_file"
  
  echo "=========================================================="
  echo "🤖 AI Debug Assistant: Optimized Context Generation"
  echo "=========================================================="
  echo "Target: ${test_target:-"(auto-detect)"}"
  echo "Mode: $([ $quick_mode -eq 1 ] && echo "Quick" || echo "Full")"
  echo "Context: $([ $full_context -eq 1 ] && echo "Verbose" || echo "AI Context")"
  echo "Focus: ${focus_area:-"General"}"
  echo ""

  # Step 1: Capture git changes (unless skipped)
  if [[ $skip_diff -eq 0 ]]; then
    echo "📂 Analyzing git changes..."
    gitDiff --ai-context --smart-diff
    
    if [[ ! -s "$diff_file" ]]; then
      echo "⚠️  No git changes detected - focusing on existing code analysis"
    else
      local changes=$(grep -c "^📁" "$diff_file" 2>/dev/null || echo "0")
      echo "✅ Captured changes for $changes files"
    fi
  else
    echo "⏭️  Skipping git diff capture (--no-diff specified)"
  fi

  # Step 2: Run tests and capture results
  echo ""
  echo "🧪 Running tests and generating analysis..."
  
  if [[ $full_context -eq 1 ]]; then
    nxTest --full-output "$test_target"
  else
    nxTest "$test_target"  # Use AI Context output by default
  fi
  local test_exit_code=$?
  
  if [[ ! -s "$test_file" ]]; then
    echo "❌ No test output captured - test execution may have failed"
    return $test_exit_code
  fi

  # Step 3: Run prepareToPush if tests are passing
  local lint_exit_code=0
  local prettier_exit_code=0
  if [[ $exit_code -eq 0 ]]; then
    echo ""
    echo "🚀 Tests passing! Running prepareToPush (lint + format)..."
    
    # Run linting
    echo ""
    echo "🔍 Running linter..."
    echo "Command: yarn nx lint $test_target"
    
    if yarn nx lint "$test_target"; then
      echo "✅ Linting passed!"
    else
      lint_exit_code=$?
      echo "❌ Linting failed with exit code: $lint_exit_code"
    fi
    
    # Run prettier only if linting passed
    if [[ $lint_exit_code -eq 0 ]]; then
      echo ""
      echo "✨ Running code formatter..."
      echo "Command: yarn nx prettier $test_target --write"
      
      if yarn nx prettier "$test_target" --write; then
        echo "✅ Code formatting completed!"
      else
        prettier_exit_code=$?
        echo "❌ Prettier failed with exit code: $prettier_exit_code"
      fi
    else
      echo "⏭️  Skipping prettier due to lint failures"
    fi
  fi

  # Step 4: Generate intelligent AI context
  echo ""
  echo "🧠 Generating AI Context context file..."
  _create_ai_debug_context "$context_file" "$diff_file" "$test_file" "$test_target" $test_exit_code "$focus_area" $quick_mode $lint_exit_code $prettier_exit_code

  # Step 5: Generate PR description prompts if tests are passing
  if [[ $test_exit_code -eq 0 ]]; then
    echo ""
    echo "📝 Auto-generating PR description prompts..."
    _create_pr_description_prompts "$pr_description_file" "$diff_file" "$test_file" "$test_target" $test_exit_code $lint_exit_code $prettier_exit_code
  fi

  # Step 6: Provide intelligent summary and guidance
  echo ""
  _display_ai_debug_summary "$context_file" "$test_exit_code" "$focus_area" $([ $test_exit_code -eq 0 ] && echo 1 || echo 0) "$pr_description_file" $lint_exit_code $prettier_exit_code
  
  return $test_exit_code
}

# =========================================================================
# FUNCTION: _create_ai_debug_context
# =========================================================================
# Purpose: Creates an optimized AI context file with intelligent structure
# =========================================================================
_create_ai_debug_context() {
  local context_file="$1"
  local diff_file="$2"
  local test_file="$3"
  local test_target="$4"
  local exit_code="$5"
  local focus_area="$6"
  local quick_mode="$7"
  local lint_exit_code="${8:-0}"
  local prettier_exit_code="${9:-0}"
  
  # Start with AI Context header
  cat > "$context_file" << EOF
=================================================================
🤖 AI DEBUG CONTEXT - OPTIMIZED FOR ANALYSIS
=================================================================

PROJECT: Angular NX Monorepo
TARGET: ${test_target:-"Auto-detected"}
STATUS: $([ $exit_code -eq 0 ] && echo "✅ TESTS PASSING" || echo "❌ TESTS FAILING")
FOCUS: ${focus_area:-"General debugging"}
TIMESTAMP: $(date)

=================================================================
🎯 ANALYSIS REQUEST
=================================================================

Please analyze this context and provide:

EOF

  # Conditional analysis requests based on test status
  if [[ $exit_code -eq 0 ]]; then
    # Tests are passing - focus on improvements and new test coverage
    cat >> "$context_file" << EOF
1. 🔍 CODE QUALITY ANALYSIS
   • Review code changes for potential improvements
   • Identify any code smells or anti-patterns
   • Check for performance optimization opportunities

2. 🎭 MOCK DATA VALIDATION (CRITICAL)
   • Review all mock data to ensure it matches real-world data structures
   • Verify mock objects have correct property names and types
   • Check that mock data represents realistic scenarios (not just minimal passing data)
   • Ensure mocked API responses match actual API contract
   • Validate that test data covers edge cases and realistic variations
   • Identify mock data that might be giving false positives

3. 🧪 TEST COVERAGE ANALYSIS
   • Missing test coverage for new functionality
   • Edge cases that should be tested
   • Additional test scenarios to prevent regressions
   • Test improvements for better maintainability
   • File-specific coverage analysis (diff coverage vs total coverage)

4. 🚀 ENHANCEMENT RECOMMENDATIONS
   • Code quality improvements
   • Better error handling or validation
   • Documentation or typing improvements
   • Performance optimizations

5. 🛡️ ROBUSTNESS IMPROVEMENTS
   • Potential edge cases to handle
   • Error scenarios to test
   • Input validation opportunities
   • Defensive programming suggestions
EOF
  else
    # Tests are failing - focus on fixing failures first, then suggest new tests
    cat >> "$context_file" << EOF
1. 🔍 ROOT CAUSE ANALYSIS
   • What specific changes are breaking the tests?
   • Are there type mismatches or interface changes?
   • Did method signatures change?

2. 🛠️ CONCRETE FIXES (PRIORITY 1)
   • Exact code changes needed to fix failing tests
   • Updated test expectations if business logic changed
   • Type definitions or interface updates required

3. 🧪 EXISTING TEST FIXES (PRIORITY 1)
   • Fix existing failing tests first
   • Update test assertions to match new behavior
   • Fix test setup or mocking issues

4. 🚀 IMPLEMENTATION GUIDANCE (PRIORITY 1)
   • Order of fixes (dependencies first)
   • Potential side effects to watch for
   • Getting tests green is the immediate priority

5. ✨ NEW TEST SUGGESTIONS (PRIORITY 2 - AFTER FIXES)
   • Missing test coverage for new functionality
   • Edge cases that should be tested
   • Additional test scenarios to prevent regressions
   • Test improvements for better maintainability
   • File-specific coverage analysis (diff coverage vs total coverage)
   • Specify files and line numbers where new tests should be added. 

NOTE: Focus on items 1-4 first to get tests passing, then implement item 5
EOF
  fi

  cat >> "$context_file" << EOF

EOF

  # Add focus-specific guidance
  case "$focus_area" in
    "types")
      echo "FOCUS AREA: TypeScript type issues and interface mismatches" >> "$context_file"
      echo "• Pay special attention to type definitions and interface changes" >> "$context_file"
      echo "• Look for property name mismatches or type incompatibilities" >> "$context_file"
      ;;
    "tests")
      echo "FOCUS AREA: Test logic and assertions" >> "$context_file"
      echo "• Focus on test expectations vs actual implementation" >> "$context_file"
      echo "• Look for test data setup issues or mock problems" >> "$context_file"
      ;;
    "performance")
      echo "FOCUS AREA: Performance and optimization" >> "$context_file"
      echo "• Identify slow tests and optimization opportunities" >> "$context_file"
      echo "• Look for inefficient test patterns or setup" >> "$context_file"
      ;;
  esac

  echo "" >> "$context_file"

  # Add intelligent test results analysis
  echo "==================================================================" >> "$context_file"
  echo "🧪 TEST RESULTS ANALYSIS" >> "$context_file"
  echo "==================================================================" >> "$context_file"
  
  if [[ -s "$test_file" ]]; then
    cat "$test_file" >> "$context_file"
  else
    echo "❌ No test results available" >> "$context_file"
  fi

  echo "" >> "$context_file"

  # Add enhanced context with lint/format results to the AI debug context file
  echo "==================================================================" >> "$context_file"
  echo "🔧 CODE QUALITY RESULTS" >> "$context_file"
  echo "==================================================================" >> "$context_file"
  
  # Add lint results
  echo "" >> "$context_file"
  echo "📋 LINTING RESULTS:" >> "$context_file"
  if [[ $lint_exit_code -eq 0 ]]; then
    echo "✅ Status: PASSED" >> "$context_file"
    echo "• All linting rules satisfied" >> "$context_file"
    echo "• No code quality issues detected" >> "$context_file"
    echo "• Code follows project style guidelines" >> "$context_file"
  else
    echo "❌ Status: FAILED (Exit code: $lint_exit_code)" >> "$context_file"
    echo "• Linting errors detected above in test output" >> "$context_file"
    echo "• Code quality issues need attention" >> "$context_file"
    echo "• Some errors may be auto-fixable with --fix flag" >> "$context_file"
  fi
  
  # Add prettier results
  echo "" >> "$context_file"
  echo "✨ FORMATTING RESULTS:" >> "$context_file"
  if [[ $prettier_exit_code -eq 0 ]]; then
    echo "✅ Status: COMPLETED" >> "$context_file"
    echo "• Code formatting applied successfully" >> "$context_file"
    echo "• All files follow consistent style" >> "$context_file"
    echo "• Ready for commit" >> "$context_file"
  elif [[ $lint_exit_code -ne 0 ]]; then
    echo "⏭️  Status: SKIPPED" >> "$context_file"
    echo "• Skipped due to linting failures" >> "$context_file"
    echo "• Fix linting issues first" >> "$context_file"
    echo "• Formatting will run after lint passes" >> "$context_file"
  else
    echo "❌ Status: FAILED (Exit code: $prettier_exit_code)" >> "$context_file"
    echo "• Formatting errors detected" >> "$context_file"
    echo "• Check syntax errors in files" >> "$context_file"
    echo "• Ensure all files are valid" >> "$context_file"
  fi
  
  # Add overall readiness status
  echo "" >> "$context_file"
  echo "🚀 PUSH READINESS:" >> "$context_file"
  if [[ $exit_code -eq 0 && $lint_exit_code -eq 0 && $prettier_exit_code -eq 0 ]]; then
    echo "✅ READY TO PUSH" >> "$context_file"
    echo "• Tests: Passing ✅" >> "$context_file"
    echo "• Lint: Clean ✅" >> "$context_file"  
    echo "• Format: Applied ✅" >> "$context_file"
    echo "• All quality gates satisfied" >> "$context_file"
  else
    echo "⚠️  NOT READY - Issues need resolution:" >> "$context_file"
    [[ $exit_code -ne 0 ]] && echo "• Tests: Failing ❌" >> "$context_file"
    [[ $lint_exit_code -ne 0 ]] && echo "• Lint: Issues detected ❌" >> "$context_file"
    [[ $prettier_exit_code -ne 0 ]] && echo "• Format: Failed ❌" >> "$context_file"
  fi

  # Add git changes analysis
  echo "" >> "$context_file"
  echo "==================================================================" >> "$context_file"
  echo "📋 CODE CHANGES ANALYSIS" >> "$context_file"
  echo "==================================================================" >> "$context_file"
  
  if [[ -s "$diff_file" ]]; then
    cat "$diff_file" >> "$context_file"
  else
    echo "ℹ️  No recent code changes detected" >> "$context_file"
    echo "" >> "$context_file"
    echo "This suggests the test failures may be due to:" >> "$context_file"
    echo "• Environment or configuration issues" >> "$context_file"
    echo "• Dependencies or version conflicts" >> "$context_file"
    echo "• Test setup or teardown problems" >> "$context_file"
    echo "• Race conditions or timing issues" >> "$context_file"
  fi

  # Add final AI guidance
  echo "" >> "$context_file"
  echo "==================================================================" >> "$context_file"
  echo "🚀 AI ASSISTANT GUIDANCE" >> "$context_file"
  echo "==================================================================" >> "$context_file"
  echo "This context file is optimized for AI analysis with:" >> "$context_file"
  echo "• Structured failure information for easy parsing" >> "$context_file"
  echo "• Code changes correlated with test failures" >> "$context_file"
  echo "• Clear focus areas for targeted analysis" >> "$context_file"
  echo "• Actionable fix categories for systematic resolution" >> "$context_file"
  echo "" >> "$context_file"
  echo "Context file size: $(wc -l < "$context_file") lines (optimized for AI processing)" >> "$context_file"
}

# =========================================================================
# FUNCTION: _create_pr_description_prompts
# =========================================================================
# Purpose: Creates AI prompts for generating GitHub PR descriptions based
#          on code changes and test results
# =========================================================================
_create_pr_description_prompts() {
  local pr_file="$1"
  local diff_file="$2"
  local test_file="$3"
  local test_target="$4"
  local exit_code="$5"
  local lint_exit_code="$6"
  local prettier_exit_code="$7"
  
  # Start with PR description prompt header
  cat > "$pr_file" << EOF
=================================================================
📝 GITHUB PR DESCRIPTION GENERATION PROMPTS
=================================================================

INSTRUCTIONS FOR AI ASSISTANT:
Using the data gathered in the ai-debug-context.txt file, write a GitHub PR 
description that follows the format below. Focus on newly added functions 
and updates. Don't add fluff.

=================================================================
🎯 PRIMARY PR DESCRIPTION PROMPT
=================================================================

Please analyze the code changes and test results to create a GitHub PR description 
following this exact format:

**Problem**
What is the problem you're solving or feature you're implementing? Please include 
a link to any related discussion or tasks in Jira if applicable.
[Jira Link if applicable]

**Solution**
Describe the feature or bug fix -- what's changing?

**Details**
Include a brief overview of the technical process you took (or are going to take!) 
to get from the problem to the solution.

**QA**
Provide any technical details needed to test this change and/or parts that you 
wish to have tested.

=================================================================
📊 CONTEXT FOR PR DESCRIPTION
=================================================================

EOF

  # Add project context
  echo "PROJECT: Angular NX Monorepo" >> "$pr_file"
  echo "TARGET: ${test_target:-"Multiple components"}" >> "$pr_file"
  echo "TEST STATUS: $([ $exit_code -eq 0 ] && echo "✅ All tests passing" || echo "❌ Some tests failing (needs fixes)")" >> "$pr_file"
  echo "LINT STATUS: $([ $lint_exit_code -eq 0 ] && echo "✅ Linting passed" || echo "❌ Linting failed")" >> "$pr_file"
  echo "FORMAT STATUS: $([ $prettier_exit_code -eq 0 ] && echo "✅ Code formatted" || echo "❌ Formatting failed")" >> "$pr_file"
  echo "TIMESTAMP: $(date)" >> "$pr_file"
  echo "" >> "$pr_file"

  # Add specific testing instructions
  echo "📋 TESTING INSTRUCTIONS:" >> "$pr_file"
  echo "• Run: yarn nx test ${test_target:-"[project-name]"}" >> "$pr_file"
  echo "• Run: yarn nx lint ${test_target:-"[project-name]"}" >> "$pr_file"
  echo "• Run: yarn nx prettier ${test_target:-"[project-name]"} --write" >> "$pr_file"
  echo "• Verify all tests pass and code follows style guidelines" >> "$pr_file"
  echo "• Test the specific functionality mentioned in the Solution section" >> "$pr_file"
  echo "• Check for any UI/UX changes if applicable" >> "$pr_file"
  echo "" >> "$pr_file"

  echo "🎯 READY TO USE: Copy the primary prompt above, attach ai-debug-context.txt, and ask your AI assistant to create the PR description!" >> "$pr_file"
}

# =========================================================================
# FUNCTION: _display_ai_debug_summary
# =========================================================================
# Purpose: Displays intelligent summary and next steps for AI debugging
# =========================================================================
_display_ai_debug_summary() {
  local context_file="$1"
  local exit_code="$2"
  local focus_area="$3"
  local pr_description_enabled="$4"
  local pr_description_file="$5"
  local lint_exit_code="${6:-0}"
  local prettier_exit_code="${7:-0}"
  
  local context_size=$(du -h "$context_file" | cut -f1)
  local line_count=$(wc -l < "$context_file")
  
  echo "=========================================================="
  if [[ $exit_code -eq 0 ]]; then
    if [[ $lint_exit_code -eq 0 && $prettier_exit_code -eq 0 ]]; then
      echo "🎉 Ready to Push: Tests ✅ Lint ✅ Format ✅"
    elif [[ $lint_exit_code -ne 0 ]]; then
      echo "⚠️  Tests Pass but Lint Issues: Tests ✅ Lint ❌ Format ⏭️"
    elif [[ $prettier_exit_code -ne 0 ]]; then
      echo "⚠️  Tests Pass but Format Issues: Tests ✅ Lint ✅ Format ❌"
    fi
    echo "=========================================================="
    
    if [[ $lint_exit_code -eq 0 && $prettier_exit_code -eq 0 ]]; then
      echo "🎯 FOCUS: Final code review and PR preparation"
      echo ""
      echo "📋 SUGGESTED AI PROMPTS:"
      echo '• "Generate a GitHub PR description using the PR description prompts file"'
      echo '• "Review this code for quality and suggest any improvements"'
      echo '• "Check if mock objects have correct property names and realistic values"'
    else
      echo "🎯 FOCUS: Fix code quality issues before PR"
      echo ""
      echo "📋 SUGGESTED AI PROMPTS:"
      echo '• "Help me fix the linting/formatting issues shown above"'
      echo '• "Review this code for quality and suggest any improvements"'
      if [[ $lint_exit_code -ne 0 ]]; then
        echo '• "Analyze the linting errors and provide specific fixes"'
      fi
    fi
  else
    echo "🔍 AI Debug Context: Test failures detected"
    echo "=========================================================="
    echo "🎯 FOCUS: Failure analysis and fix recommendations"
    echo ""
    echo "📋 SUGGESTED AI PROMPTS:"
    echo '• "Analyze these test failures and provide specific fixes first"'
    echo '• "What code changes are breaking these tests and how do I fix them?"'
    echo '• "Help me fix failing tests first, then suggest new test coverage"'
  fi
  
  echo ""
  echo "📄 CONTEXT FILE DETAILS:"
  echo "• Location: $context_file"
  echo "• Size: $context_size ($line_count lines)"
  echo "• Optimized: ✅ AI-friendly structure"
  echo "• Focus: ${focus_area:-"General"}"
  if [[ $exit_code -eq 0 ]]; then
    echo "• Tests: ✅ Passing"
    echo "• Lint: $([ $lint_exit_code -eq 0 ] && echo "✅ Passed" || echo "❌ Failed")"
    echo "• Format: $([ $prettier_exit_code -eq 0 ] && echo "✅ Applied" || echo "❌ Failed")"
  fi
  
  if [[ $pr_description_enabled -eq 1 ]]; then
    local pr_size=$(du -h "$pr_description_file" | cut -f1)
    echo ""
    echo "📝 PR DESCRIPTION PROMPTS:"
    echo "• Location: $pr_description_file"
    echo "• Size: $pr_size"
    echo "• Ready: ✅ GitHub PR format prompts generated"
  fi
  
  echo ""
  echo "🚀 NEXT STEPS:"
  if [[ $exit_code -eq 0 ]]; then
    if [[ $lint_exit_code -eq 0 && $prettier_exit_code -eq 0 ]]; then
      echo "1. Upload PR description prompts to your AI assistant"
      echo "2. Generate GitHub PR description"
      echo "3. Review any formatting changes made by prettier"
      echo "4. Commit and push: git add . && git commit && git push"
    else
      if [[ $lint_exit_code -ne 0 ]]; then
        echo "1. Fix linting errors (try: yarn nx lint $test_target --fix)"
      fi
      if [[ $prettier_exit_code -ne 0 ]]; then
        echo "$([ $lint_exit_code -ne 0 ] && echo "2" || echo "1"). Fix prettier formatting issues"
      fi
      echo "$([ $lint_exit_code -ne 0 ] && [ $prettier_exit_code -ne 0 ] && echo "3" || echo "2"). Re-run aiDebug to verify all checks pass"
    fi
  else
    echo "1. Upload the context file to your AI assistant"
    echo "2. Use one of the suggested prompts above"
    echo "3. Follow the AI's specific fix recommendations"
    echo "4. Re-run aiDebug to verify fixes"
  fi
  
  echo ""
  echo "🔄 WORKFLOW OPTIMIZATION:"
  if [[ $exit_code -eq 0 ]]; then
    if [[ $lint_exit_code -eq 0 && $prettier_exit_code -eq 0 ]]; then
      echo "• 🎉 All checks passed - ready for commit and push!"
      echo "• ✅ Tests passing + lint clean + code formatted"
      echo "• 📝 PR description prompts generated and ready to use"
    else
      echo "• ⚠️  Tests pass but code quality needs attention"
      echo "• 🔧 Fix lint/format issues then re-run aiDebug"
      echo "• 📝 PR description will be available after all checks pass"
    fi
  else
    echo "• Use --quick for faster iteration during fixing"
    echo "• All quality checks (lint + format) will run when tests pass"
    echo "• Re-run without flags for comprehensive analysis including mock validation"
  fi
  echo "=========================================================="
}