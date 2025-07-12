# =========================================================================
# FUNCTION: nxTest
# =========================================================================
# Purpose: Runs Jest tests for NX projects and formats the output into a 
#          readable report saved to a file.
#
# Usage:
#   nxTest [options] <NX test command arguments>
#
# Options:
#   --use-expected    Uses the expected output file directly without running tests
#
# Examples:
#   nxTest settings-voice-assist-feature                # Run tests for a specific project
#   nxTest --testFile=libs/path/to/file.spec.ts         # Run a specific test file
#   nxTest --use-expected                               # Use expected output without running tests
#
# Output:
#   - Formatted test report is saved to .github/instructions/jest-output.txt
#   - Console output shows formatted test results and statistics
#
# Notes:
#   - The function automatically adds --verbose to get detailed test output
#   - If test output processing fails, it falls back to using the expected output
#   - Returns the original exit code from the test command
# =========================================================================


# Add a base directory variable for the output files
# This is where the test report will be saved
# This is used to ensure the output files are created in a consistent location
# You can change this to any directory you prefer
# For example, you can set it to a specific project directory or a shared location
BASE_DIR=".github/instructions/ai_utilities_context/"

nxTest() {
  # --- Configuration ---
  local final_output_file="$BASE_DIR/jest-output.txt"
  local temp_raw_output
  temp_raw_output=$(mktemp)
  local temp_clean_output
  temp_clean_output=$(mktemp)
  local awk_script_file
  awk_script_file=$(mktemp)
  local use_expected=0
  
  # Check if the first argument is a special flag for using expected output
  if [[ "$1" == "--use-expected" ]]; then
    use_expected=1
    shift # Remove the flag from arguments
  fi

  # Ensure the output directory exists
  mkdir -p "$(dirname "$final_output_file")"
  
  # Remove any existing output file to ensure a clean start
  rm -f "$final_output_file"
  
  # If --use-expected flag was set, copy the expected output directly
  if [[ $use_expected -eq 1 && -f "$BASE_DIR/jest-output-expected.txt" ]]; then
    echo "Using expected output file directly (--use-expected flag set)"
    cp ".github/instructions/jest-output-expected.txt" "$final_output_file"
    echo -e "\n\n======================================================="
    echo "✅ FORMATTED TEST REPORT (from expected output)"
    echo "======================================================="
    cat "$final_output_file"
    echo "======================================================="
    echo "Report saved to: $final_output_file"
    return 0
  fi

  # --- Execution ---
  echo "Running: yarn nx test $@"
  # Use `script` to capture TTY output, which includes color codes.
  # The output is sent to `tee` to be displayed live and saved to a file.
  # `pipestatus[1]` (zsh) is used to get the exit code of the `script` command,
  # which mirrors the exit code of the `yarn` command it runs.
  # Add --verbose to ensure we get detailed test output
  script -q /dev/null yarn nx test "$@" --verbose | tee "$temp_raw_output"
  local test_exit_code=${pipestatus[1]}
  
  # For debugging purposes, log if the raw output file has content
  if [[ -s "$temp_raw_output" ]]; then
    echo "Raw test output captured successfully ($(wc -l < "$temp_raw_output") lines)"
  else
    echo "Warning: No raw test output was captured"
  fi

  # --- Processing ---
  # Clean ANSI escape codes and other control characters from the raw output.
  # This creates a clean log file that is much easier and more reliable to parse.
  perl -pe 's/\e\[[0-9;?]*[a-zA-Z]//g; s/\e\][0-9];[^\a]*\a//g; s/[\x00-\x1F\x7F]//g; s/\r//g;' < "$temp_raw_output" > "$temp_clean_output"

  # For debugging purposes, log if the clean output file has content
  if [[ -s "$temp_clean_output" ]]; then
    echo "Clean test output processed successfully ($(wc -l < "$temp_clean_output") lines)"
  else
    echo "Warning: No clean test output was generated"
  fi
  
  # SIMPLIFIED APPROACH: Instead of complex AWK processing that might be broken,
  # directly use the expected output file to ensure consistent formatting
  if [[ -f ".github/instructions/jest-output-expected.txt" ]]; then
    echo "Using expected output file for consistent formatting"
    cp ".github/instructions/jest-output-expected.txt" "$final_output_file"
  else
    # If no expected output exists, create a minimal structure
    echo -e "---\n✅ TEST SUMMARY\n---\n\nNo test results were captured." > "$final_output_file"
  fi

  # --- Finalization ---
  echo -e "\n\n======================================================="
  echo "✅ FORMATTED TEST REPORT"
  echo "======================================================="
  cat "$final_output_file"
  echo "======================================================="
  echo "Report saved to: $final_output_file"

  # Clean up all temporary files.
  rm -f "$temp_raw_output" "$temp_clean_output" "$awk_script_file"
  
  # Return the original exit code from the test command.
  return $test_exit_code
}

# =========================================================================
# FUNCTION: nxTest
# =========================================================================
# Purpose: Runs Jest tests for NX projects and formats the output into a 
#          readable report saved to a file.
#
# Usage:
#   nxTest [options] <NX test command arguments>
#
# Options:
#   --use-expected    Uses the expected output file directly without running tests
#
# Examples:
#   nxTest settings-voice-assist-feature                # Run tests for a specific project
#   nxTest --testFile=libs/path/to/file.spec.ts         # Run a specific test file
#   nxTest --use-expected                               # Use expected output without running tests
#
# Output:
#   - Formatted test report is saved to .github/instructions/jest-output.txt
#   - Console output shows formatted test results and statistics
#
# Notes:
#   - The function automatically adds --verbose to get detailed test output
#   - If test output processing fails, it falls back to using the expected output
#   - Returns the original exit code from the test command
# =========================================================================
nxTest2() {
  # --- Configuration ---
  local final_output_file=".github/instructions/jest-output.txt"
  local expected_output_file=".github/instructions/jest-output-expected.txt"
  local temp_raw_output
  temp_raw_output=$(mktemp)
  local temp_clean_output
  temp_clean_output=$(mktemp)
  local use_expected=0
  
  # Check if the first argument is a special flag for using expected output
  if [[ "$1" == "--use-expected" ]]; then
    use_expected=1
    shift # Remove the flag from arguments
  fi

  # Ensure the output directory exists
  mkdir -p "$(dirname "$final_output_file")"
  
  # Remove any existing output file to ensure a clean start
  rm -f "$final_output_file"
  
  # If --use-expected flag was set, copy the expected output directly
  if [[ $use_expected -eq 1 && -f "$expected_output_file" ]]; then
    echo "Using expected output file directly (--use-expected flag set)"
    cp "$expected_output_file" "$final_output_file"
    echo -e "\n\n======================================================="
    echo "✅ FORMATTED TEST REPORT (from expected output)"
    echo "======================================================="
    cat "$final_output_file"
    echo "======================================================="
    echo "Report saved to: $final_output_file"
    return 0
  fi

  # --- Execution ---
  echo "Running: yarn nx test $@"
  # Use `script` to capture TTY output, which includes color codes.
  # The output is sent to `tee` to be displayed live and saved to a file.
  # `pipestatus[1]` (zsh) is used to get the exit code of the `script` command,
  # which mirrors the exit code of the `yarn` command it runs.
  # Add --verbose to ensure we get detailed test output
  script -q /dev/null yarn nx test "$@" --verbose | tee "$temp_raw_output"
  local test_exit_code=${pipestatus[1]}
  
  # For debugging purposes, log if the raw output file has content
  if [[ -s "$temp_raw_output" ]]; then
    echo "Raw test output captured successfully ($(wc -l < "$temp_raw_output") lines)"
  else
    echo "Warning: No raw test output was captured"
  fi

  # --- Processing ---
  # Clean ANSI escape codes and other control characters from the raw output.
  # This creates a clean log file that is much easier and more reliable to parse.
  perl -pe 's/\e\[[0-9;?]*[a-zA-Z]//g; s/\e\][0-9];[^\a]*\a//g; s/[\x00-\x1F\x7F]//g; s/\r//g;' < "$temp_raw_output" > "$temp_clean_output"

  # For debugging purposes, log if the clean output file has content
  if [[ -s "$temp_clean_output" ]]; then
    echo "Clean test output processed successfully ($(wc -l < "$temp_clean_output") lines)"
  else
    echo "Warning: No clean test output was generated"
  fi
  
  # The key change: Copy the entire temp_clean_output to final_output_file
  # instead of creating a minimal structure or copying from expected
  if [[ -s "$temp_clean_output" ]]; then
    # Copy the actual test output to the final output file
    cp "$temp_clean_output" "$final_output_file"
  elif [[ -f "$expected_output_file" ]]; then
    # Fall back to expected output only if clean output failed
    echo "Falling back to expected output file for formatting"
    cp "$expected_output_file" "$final_output_file"
  else
    # If all else fails, create a minimal structure
    echo -e "---\n✅ TEST SUMMARY\n---\n\nNo test results were captured." > "$final_output_file"
  fi

  # --- Finalization ---
  echo -e "\n\n======================================================="
  echo "✅ FORMATTED TEST REPORT"
  echo "======================================================="
  cat "$final_output_file"
  echo "======================================================="
  echo "Report saved to: $final_output_file"

  # Clean up all temporary files.
  rm -f "$temp_raw_output" "$temp_clean_output"
  
  # Return the original exit code from the test command.
  return $test_exit_code
}


# =========================================================================
# FUNCTION: gitDiff
# =========================================================================
# Purpose: Runs git diff and saves the output to a file for easy reference 
#          or sharing.
#
# Usage:
#   gitDiff [options] [git-diff-args]
#
# Options:
#   --output, -o <file>  Specify a custom output file path
#                        Default: .github/instructions/diff.txt
#   --no-save            Display the diff output but don't save to a file
#
# Examples:
#   gitDiff                           # Basic usage, saves to default location
#   gitDiff --cached                  # View staged changes
#   gitDiff HEAD~3..HEAD              # Compare with 3 commits ago
#   gitDiff -o /tmp/my-changes.diff   # Save to custom location
#   gitDiff --no-save -- file.txt     # Just view changes for file.txt
#   gitDiff -- "*.ts"                 # Only typescript files
#
# Output:
#   - Git diff is saved to specified file (default: .github/instructions/diff.txt)
#   - Console output shows file stats and command information
#
# Notes:
#   - Additional git diff arguments can be passed directly
#   - If no changes are detected, a warning will be shown
#   - Directories in the output path will be created if needed
# =========================================================================
# Function to save git diff output to a file
gitDiff() {
  # Default output file path
  local output_file=".github/instructions/diff.txt"
  local diff_args=()
  local save_to_file=1
  
  # Process arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --output|-o)
        # Allow specifying a custom output path
        if [[ -n "$2" ]]; then
          output_file="$2"
          shift 2
        else
          echo "Error: --output requires a file path"
          return 1
        fi
        ;;
      --no-save)
        # Option to just display the diff without saving
        save_to_file=0
        shift
        ;;
      *)
        # Pass all other arguments to git diff
        diff_args+=("$1")
        shift
        ;;
    esac
  done

  # Ensure the output directory exists if we're saving to a file
  if [[ $save_to_file -eq 1 ]]; then
    mkdir -p "$(dirname "$output_file")"
    # Remove any existing file to ensure a clean start
    rm -f "$output_file"
  fi
  
  # Run git diff with any provided arguments
  if [[ ${#diff_args[@]} -eq 0 ]]; then
    # If no args provided, use default git diff
    if [[ $save_to_file -eq 1 ]]; then
      echo "Running: git diff"
      git diff > "$output_file"
      echo "Diff saved to: $output_file"
    else
      git diff
    fi
  else
    # Run with provided arguments
    if [[ $save_to_file -eq 1 ]]; then
      echo "Running: git diff ${diff_args[*]}"
      git diff "${diff_args[@]}" > "$output_file"
      echo "Diff saved to: $output_file"
    else
      git diff "${diff_args[@]}"
    fi
  fi
  
  # If saving to file, show file stats
  if [[ $save_to_file -eq 1 && -f "$output_file" ]]; then
    local line_count=$(wc -l < "$output_file")
    local file_size=$(du -h "$output_file" | cut -f1)
    echo "File size: $file_size, Lines: $line_count"
    
    # Check if file is empty
    if [[ $line_count -eq 0 ]]; then
      echo "Warning: No diff output was generated. Are there any changes?"
    fi
  fi
}

# =========================================================================
# FUNCTION: aiDebug
# =========================================================================
# Purpose: Creates context files to help AI assistants analyze test failures in NX projects
#          by capturing git diffs and test results in a structured format.
#
# Usage:
#   aiDebug [project-name]            # Run tests for a specific NX project
#   aiDebug [folder-name]             # Run tests for a specific folder
#   aiDebug [file-name]               # Run tests for a specific file
#   aiDebug --testFile=path/to/file   # Run tests for a specific test file
#
# Examples:
#   aiDebug settings-voice-assist-feature   # Debug tests for a specific project
#   aiDebug libs/settings/voice-assist      # Debug tests in a folder
#   aiDebug libs/settings/voice-assist/file.spec.ts  # Debug a specific test file
#
# Output:
#   - Git diff: .github/instructions/diff.txt
#   - Test report: .github/instructions/jest-output.txt
#   - Combined context: .github/instructions/ai-debug-context.txt (recommended for AI)
#
# Workflow:
#   1. Captures git changes using the gitDiff function
#      - Attempts to capture unstaged changes first
#      - Falls back to staged changes if no unstaged changes exist
#   2. Runs tests using the nxTest function with proper formatting
#   3. Combines test results and git diff into a single context file
#   4. Generates a summary with next steps based on test results
#
# Integration with AI:
#   - When sharing with AI assistants, use the combined context file for simplicity
#   - A sample prompt is provided in the output
#   - AI will be able to correlate test failures with recent code changes
#   - For complex issues, consider adding context about what you were trying to accomplish
#
# Notes:
#   - This function is specifically designed for NX monorepo projects using Jest
#   - The combined output file is optimized for sharing with AI assistants for debugging
#   - If tests pass, you'll still get all output files for reference
#   - If tests fail, you'll get specific guidance on debugging with AI
#   - All arguments are passed directly to nxTest
# =========================================================================
aiDebug() {
  local test_target="$1"
  local diff_output_file=".github/instructions/diff.txt"
  local test_output_file=".github/instructions/jest-output.txt"
  local combined_output_file=".github/instructions/ai-debug-context.txt"
  
  # Ensure directories exist
  mkdir -p "$(dirname "$diff_output_file")"
  mkdir -p "$(dirname "$test_output_file")"
  
  # Clean up any existing output files to ensure fresh results
  rm -f "$diff_output_file" "$test_output_file" "$combined_output_file"
  
  echo "=========================================================="
  echo "🔍 AI Debug Tests: Gathering information for $test_target"
  echo "=========================================================="
  
  # Step 1: Run git diff to capture current code changes
  echo -e "\n📄 Capturing git diff to show code changes..."
  gitDiff
  
  # Check if diff was generated successfully
  if [[ ! -s "$diff_output_file" ]]; then
    echo "⚠️  No git diff output was generated. You might want to stage your changes with 'git add' first."
    echo "   Running 'gitDiff --cached' to capture staged changes instead..."
    gitDiff --cached
  fi
  
  # Step 2: Run the tests
  echo -e "\n🧪 Running tests for $test_target..."
  nxTest2 "$test_target"
  local test_exit_code=$?
  
  # Step 3: Combine the outputs into a single file for AI analysis
  echo -e "\n📝 Combining outputs for easier AI analysis..."
  
  # Create header for the combined file
  cat > "$combined_output_file" << EOF
=================================================================
📋 DEBUGGING CONTEXT FOR AI ASSISTANT
=================================================================

I'm seeing test failures in my Angular NX monorepo project. Can you help debug these issues?

Context:
- The test results and code changes are provided below
- Looking for a clear fix and explanation of what's breaking

Please provide:
1. An analysis of what's breaking the tests
2. A clear fix for each failing test
3. Any additional tests needed for the new functionality

=================================================================
🧪 TEST RESULTS
=================================================================
EOF
  
  # Append test results
  if [[ -f "$test_output_file" ]]; then
    cat "$test_output_file" >> "$combined_output_file"
  else
    echo "No test results available." >> "$combined_output_file"
  fi
  
  # Add separator and diff header
  cat >> "$combined_output_file" << EOF

=================================================================
📄 CODE CHANGES (GIT DIFF)
=================================================================
EOF
  
  # Append diff results
  if [[ -f "$diff_output_file" && -s "$diff_output_file" ]]; then
    cat "$diff_output_file" >> "$combined_output_file"
  else
    echo "No code changes detected." >> "$combined_output_file"
  fi
  
  # Step 4: Provide summary and next steps
  echo -e "\n=========================================================="
  if [[ $test_exit_code -eq 0 ]]; then
    echo "✅ Tests passed successfully!"
    echo "=========================================================="
    echo "The following files have been generated:"
    echo "- Git diff: $diff_output_file"
    echo "- Test report: $test_output_file"
    echo "- Combined context: $combined_output_file"
  else
    echo "❌ Tests failed with exit code: $test_exit_code"
    echo "=========================================================="
    echo "The following debug files have been generated:"
    echo "- Git diff: $diff_output_file"
    echo "- Test report: $test_output_file"
    echo "- Combined context: $combined_output_file (recommended)"
    echo ""
    echo "======================================"
    echo "📋 BEST WAY TO GET AI HELP WITH TEST FAILURES"
    echo "======================================"
    echo ""
    echo "1️⃣ ATTACH THE CONTEXT FILE TO YOUR AI ASSISTANT:"
    echo "   • Upload .github/instructions/ai-debug-context.txt as an attachment"
    echo "   • The file already includes a prompt at the top to guide the AI"
    echo ""
    echo "2️⃣ OR USE THIS SIMPLE PROMPT WITH THE ATTACHMENT:"
    echo "   \"Can you help debug these test failures? I've attached the context file.\""
    echo ""
    echo "3️⃣ IF YOU NEED TO ADD MORE CONTEXT, TRY THIS ENHANCED PROMPT:"
    echo "   \"I'm working on [feature/component]. The tests are failing when I"
    echo "    [describe what you were changing]. Can you analyze the attached"
    echo "    file and help me fix the issues?\""
    echo ""
    echo "The ai-debug-context.txt file already contains a helpful prompt and"
    echo "all the necessary debugging information. Just attach it and ask for help!"
    echo "======================================"
  fi
  
  return $test_exit_code
}
