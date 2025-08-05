# =========================================================================
# File: functions/nxTest.zsh
# Purpose: AI Context Jest test runner for NX projects
# =========================================================================

# =========================================================================
# FUNCTION: nxTest (AI Context)
# =========================================================================
# Purpose: Runs Jest tests for NX projects and creates an AI Context 
#          report with minimal duplication and enhanced analysis focus.
#
# Usage:
#   nxTest [options] <NX test command arguments>
#
# Options:
#   --use-expected    Uses the expected output file directly without running tests
#   --full-output     Saves complete raw output (default: optimized for AI)
#
# Examples:
#   nxTest settings-voice-assist-feature                # Run tests with AI Context output
#   nxTest --full-output settings-voice-assist-feature  # Include full raw output
#   nxTest --use-expected                               # Use expected output without running tests
#
# Output:
#   - AI Context test report saved to ai_utilities_context/jest-output.txt
#   - Focuses on test results, failures, and summary while reducing noise
#
# =========================================================================

nxTest() {
  # --- Configuration ---
  local final_output_file="$AI_UTILITIES_BASE_DIR/jest-output.txt"
  local expected_output_file="$AI_UTILITIES_BASE_DIR/jest-output-expected.txt"
  local temp_raw_output
  temp_raw_output=$(mktemp)
  local temp_clean_output
  temp_clean_output=$(mktemp)
  local temp_optimized_output
  temp_optimized_output=$(mktemp)
  local use_expected=0
  local full_output=0
  
  # Process command line arguments
  local args=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --use-expected)
        use_expected=1
        shift
        ;;
      --full-output)
        full_output=1
        shift
        ;;
      *)
        args+=("$1")
        shift
        ;;
    esac
  done

  # Ensure the output directory exists
  mkdir -p "$(dirname "$final_output_file")"
  rm -f "$final_output_file"
  
  # If --use-expected flag was set, copy the expected output directly
  if [[ $use_expected -eq 1 && -f "$expected_output_file" ]]; then
    echo "Using expected output file directly (--use-expected flag set)"
    cp "$expected_output_file" "$final_output_file"
    echo -e "\n======================================================="
    echo "✅ FORMATTED TEST REPORT (from expected output)"
    echo "======================================================="
    cat "$final_output_file"
    echo "======================================================="
    echo "Report saved to: $final_output_file"
    return 0
  fi

  # --- Execution ---
  echo "Running: yarn nx test ${args[*]}"
  echo "Output mode: $([ $full_output -eq 1 ] && echo "Full output" || echo "AI Context")"
  
  script -q /dev/null yarn nx test "${args[@]}" --verbose | tee "$temp_raw_output"
  local test_exit_code=${pipestatus[1]}
  
  # Basic validation of raw output
  if [[ -s "$temp_raw_output" ]]; then
    echo "Raw test output captured successfully ($(wc -l < "$temp_raw_output") lines)"
  else
    echo "Warning: No raw test output was captured"
    echo "❌ Test execution may have failed"
    return $test_exit_code
  fi

  # --- Enhanced ANSI Cleaning ---
  echo "Processing output for AI analysis..."
  
  # Clean ANSI codes with multiple fallback methods
  if tr -d '\r' < "$temp_raw_output" | sed 's/\x1b\[[0-9;]*[mGKHJA-Z]//g' > "$temp_clean_output" 2>/dev/null && [[ -s "$temp_clean_output" ]]; then
    echo "✅ ANSI cleaning successful"
  elif perl -pe 's/\x1b\[[0-9;]*[a-zA-Z]//g' < "$temp_raw_output" > "$temp_clean_output" 2>/dev/null && [[ -s "$temp_clean_output" ]]; then
    echo "✅ ANSI cleaning successful (Perl fallback)"
  else
    echo "⚠️  ANSI cleaning failed, using raw output"
    cp "$temp_raw_output" "$temp_clean_output"
  fi

  # --- AI context Process ---
  if [[ $full_output -eq 1 ]]; then
    echo "📄 Using full output (--full-output specified)"
    cp "$temp_clean_output" "$final_output_file"
  else
    echo "🤖 Optimizing output for AI analysis..."
    _create_ai_optimized_output "$temp_clean_output" "$temp_optimized_output" "${args[*]}" $test_exit_code
    cp "$temp_optimized_output" "$final_output_file"
  fi

  # --- Finalization ---
  echo -e "\n======================================================="
  echo "✅ TEST REPORT"
  echo "======================================================="
  cat "$final_output_file"
  echo "======================================================="
  echo "Report saved to: $final_output_file"
  
  local line_count=$(wc -l < "$final_output_file")
  local file_size=$(du -h "$final_output_file" | cut -f1)
  echo "Optimized output: $file_size, Lines: $line_count ($([ $full_output -eq 1 ] && echo "full" || echo "optimized"))"

  # Clean up temporary files
  rm -f "$temp_raw_output" "$temp_clean_output" "$temp_optimized_output"
  
  return $test_exit_code
}

# =========================================================================
# FUNCTION: _create_ai_optimized_output
# =========================================================================
# Purpose: Creates an AI Context version of test output by removing
#          redundant information and highlighting key data for analysis.
# =========================================================================
_create_ai_optimized_output() {
  local input_file="$1"
  local output_file="$2" 
  local test_args="$3"
  local exit_code="$4"
  
  # Extract key information from the raw output
  local test_command="yarn nx test $test_args"
  local total_suites=$(grep -o "Test Suites:.*total" "$input_file" | tail -1 || echo "")
  local total_tests=$(grep -o "Tests:.*total" "$input_file" | tail -1 || echo "")
  local test_time=$(grep -o "Time:.*s" "$input_file" | tail -1 || echo "")
  local failed_suites=$(grep -c "FAIL.*\.spec\.ts" "$input_file" || echo "0")
  local passed_suites=$(grep -c "PASS.*\.spec\.ts" "$input_file" || echo "0")
  
  # Create optimized output
  cat > "$output_file" << EOF
=================================================================
🤖 TEST ANALYSIS REPORT
=================================================================

COMMAND: $test_command
EXIT CODE: $exit_code
STATUS: $([ $exit_code -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")

=================================================================
📊 EXECUTIVE SUMMARY
=================================================================
$total_suites
$total_tests
$test_time
Test Suites: $passed_suites passed, $failed_suites failed

EOF

  # Add failure analysis if tests failed
  if [[ $exit_code -ne 0 ]]; then
    echo "==================================================================" >> "$output_file"
    echo "💥 FAILURE ANALYSIS" >> "$output_file"
    echo "==================================================================" >> "$output_file"
    
    # Extract compilation errors
    if grep -q "Test suite failed to run" "$input_file"; then
      echo "" >> "$output_file"
      echo "🔥 COMPILATION/RUNTIME ERRORS:" >> "$output_file"
      echo "--------------------------------" >> "$output_file"
      
      # Extract TypeScript errors and runtime failures
      awk '/Test suite failed to run/,/^$/ {
        if (/error TS[0-9]+/ || /Property.*does not exist/ || /Cannot find/ || /Type.*is not assignable/) {
          print "  • " $0
        }
      }' "$input_file" >> "$output_file"
    fi
    
    # Extract test failures
    if grep -q "✕\|●.*failed\|expect.*toEqual" "$input_file"; then
      echo "" >> "$output_file"
      echo "🧪 TEST FAILURES:" >> "$output_file"
      echo "-----------------" >> "$output_file"
      
      # Extract specific test failures with context
      awk '/● .*›.*/ {
        test_name = $0
        getline
        failure_reason = $0
        print "  • " test_name
        print "    " failure_reason
        print ""
      }' "$input_file" >> "$output_file"
      
      # Extract expect() failures
      grep -A 3 -B 1 "expect.*toEqual\|Expected.*Received" "$input_file" | 
      sed 's/^/    /' >> "$output_file"
    fi
    
    echo "" >> "$output_file"
  fi

  # Add key test results (only for significant test suites)
  echo "==================================================================" >> "$output_file"
  echo "🧪 TEST RESULTS SUMMARY" >> "$output_file"
  echo "==================================================================" >> "$output_file"
  
  # Extract test suite results with key information
  awk '
    /PASS.*\.spec\.ts/ { 
      suite = $0
      gsub(/.*PASS +[^ ]+ +/, "", suite)
      gsub(/\([0-9.]+ s\)/, "", suite)
      print "✅ " suite
    }
    /FAIL.*\.spec\.ts/ { 
      suite = $0
      gsub(/.*FAIL +[^ ]+ +/, "", suite) 
      gsub(/\([0-9.]+ s\)/, "", suite)
      print "❌ " suite
    }
  ' "$input_file" >> "$output_file"
  
  # Add performance insights if available
  if grep -q "Time:" "$input_file"; then
    echo "" >> "$output_file"
    echo "==================================================================" >> "$output_file"
    echo "⚡ PERFORMANCE INSIGHTS" >> "$output_file"
    echo "==================================================================" >> "$output_file"
    echo "$test_time" >> "$output_file"
    
    # Extract slow tests (>1s)
    awk '/✓.*\([0-9]+ ms\)/ {
      if (/\([0-9]{4,} ms\)/ || /\([1-9][0-9]+ ms\)/) {
        gsub(/^[[:space:]]*✓[[:space:]]*/, "")
        print "🐌 SLOW: " $0
      }
    }' "$input_file" >> "$output_file"
  fi

  # Add final summary for AI context
  echo "" >> "$output_file"
  echo "==================================================================" >> "$output_file"
  echo "🎯 AI ANALYSIS CONTEXT" >> "$output_file"
  echo "==================================================================" >> "$output_file"
  echo "This report focuses on:">> "$output_file"
  echo "• Test failures and their root causes" >> "$output_file"
  echo "• Compilation/TypeScript errors" >> "$output_file"
  echo "• Performance issues (slow tests)" >> "$output_file"
  echo "• Overall test health metrics" >> "$output_file"
  echo "" >> "$output_file"
  echo "Key areas for analysis:" >> "$output_file"
  if [[ $exit_code -ne 0 ]]; then
    echo "• 🔍 Focus on failure analysis section above" >> "$output_file"
    echo "• 🔗 Correlate failures with recent code changes" >> "$output_file"
    echo "• 🛠️  Identify patterns in TypeScript errors" >> "$output_file"
  else
    echo "• ✅ All tests passing - check for performance optimizations" >> "$output_file"
    echo "• 📈 Monitor test execution time trends" >> "$output_file"
  fi
  echo "" >> "$output_file"
  echo "Original output reduced from $(wc -l < "$input_file") lines to $(wc -l < "$output_file") lines for AI efficiency." >> "$output_file"
}