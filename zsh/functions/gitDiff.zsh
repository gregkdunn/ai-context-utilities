# =========================================================================
# File: functions/gitDiff.zsh
# Purpose: Smart git change capture with AI-optimized analysis
# =========================================================================

# =========================================================================
# FUNCTION: gitDiff (AI-Optimized)
# =========================================================================
# Purpose: Captures git changes and formats them for AI analysis with 
#          intelligent diff selection and change categorization.
#
# Usage:
#   gitDiff [options] [git-diff-args]
#
# Options:
#   --output, -o <file>   Custom output file (default: ai_utilities_context/diff.txt)
#   --no-save            Display only, don't save to file
#   --ai-context         Generate AI-friendly diff with change analysis
#   --smart-diff         Automatically select best diff strategy
#
# Examples:
#   gitDiff                     # Smart diff detection with AI context
#   gitDiff --cached            # Only staged changes
#   gitDiff --ai-context        # Enhanced AI-friendly format
#   gitDiff HEAD~1..HEAD        # Compare with last commit
#   gitDiff --no-save -- "*.ts" # View TypeScript changes only
#
# AI Optimization Features:
#   - Automatic detection of unstaged vs staged changes
#   - Change categorization (new files, modifications, deletions)
#   - File type analysis for relevant changes
#   - Context-aware diff selection
#   - Summary statistics for AI analysis
#
# =========================================================================

gitDiff() {
  # Default configuration
  local output_file="$AI_UTILITIES_BASE_DIR/diff.txt"
  local diff_args=()
  local save_to_file=1
  local ai_context=1  # Default to AI-friendly format
  local smart_diff=1  # Default to smart diff detection
  
  # Process arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --output|-o)
        if [[ -n "$2" ]]; then
          output_file="$2"
          shift 2
        else
          echo "❌ Error: --output requires a file path"
          return 1
        fi
        ;;
      --no-save)
        save_to_file=0
        shift
        ;;
      --ai-context)
        ai_context=1
        shift
        ;;
      --smart-diff)
        smart_diff=1
        shift
        ;;
      --no-ai-context)
        ai_context=0
        shift
        ;;
      *)
        diff_args+=("$1")
        shift
        ;;
    esac
  done

  # Ensure output directory exists
  if [[ $save_to_file -eq 1 ]]; then
    mkdir -p "$(dirname "$output_file")"
    rm -f "$output_file"
  fi

  # Smart diff detection if no specific args provided
  if [[ ${#diff_args[@]} -eq 0 && $smart_diff -eq 1 ]]; then
    echo "🔍 Smart diff detection..."
    
    # Check for unstaged changes
    if git diff --quiet; then
      # No unstaged changes, check staged
      if git diff --cached --quiet; then
        # No staged changes, compare with last commit
        if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
          diff_args=("HEAD~1..HEAD")
          echo "📋 Using last commit changes (no unstaged/staged changes found)"
        else
          echo "⚠️  No changes detected (initial commit or clean working directory)"
          if [[ $save_to_file -eq 1 ]]; then
            _create_no_changes_output "$output_file"
          fi
          return 0
        fi
      else
        diff_args=("--cached")
        echo "📂 Using staged changes"
      fi
    else
      echo "📝 Using unstaged changes"
      # Use default (unstaged changes)
    fi
  fi

  # Generate the diff
  local temp_diff
  temp_diff=$(mktemp)
  
  if [[ ${#diff_args[@]} -eq 0 ]]; then
    echo "Running: git diff"
    git diff > "$temp_diff"
  else
    echo "Running: git diff ${diff_args[*]}"
    git diff "${diff_args[@]}" > "$temp_diff"
  fi

  # Process the diff for AI context
  if [[ $ai_context -eq 1 && -s "$temp_diff" ]]; then
    if [[ $save_to_file -eq 1 ]]; then
      _create_ai_diff_context "$temp_diff" "$output_file" "${diff_args[*]}"
    else
      _create_ai_diff_context "$temp_diff" "/dev/stdout" "${diff_args[*]}"
    fi
  else
    # Standard diff output
    if [[ $save_to_file -eq 1 ]]; then
      cp "$temp_diff" "$output_file"
    else
      cat "$temp_diff"
    fi
  fi

  # Show statistics and validation
  if [[ $save_to_file -eq 1 && -f "$output_file" ]]; then
    local line_count=$(wc -l < "$output_file")
    local file_size=$(du -h "$output_file" | cut -f1)
    
    if [[ $line_count -eq 0 ]]; then
      echo "⚠️  No diff output generated"
    else
      echo "✅ Diff saved to: $output_file"
      echo "📊 Size: $file_size, Lines: $line_count"
      
      # Quick content summary
      if [[ $ai_context -eq 1 ]]; then
        local files_changed=$(grep -c "^📁" "$output_file" 2>/dev/null || echo "0")
        echo "📈 AI-optimized format: $files_changed files analyzed"
      fi
    fi
  fi

  rm -f "$temp_diff"
}

# =========================================================================
# FUNCTION: _create_ai_diff_context
# =========================================================================
# Purpose: Creates an AI-optimized diff with change analysis and context
# =========================================================================
_create_ai_diff_context() {
  local diff_file="$1"
  local output_file="$2"
  local diff_args="$3"
  
  # Initialize output
  cat > "$output_file" << EOF
=================================================================
🔍 AI-OPTIMIZED GIT DIFF ANALYSIS
=================================================================

COMMAND: git diff $diff_args
TIMESTAMP: $(date)
BRANCH: $(git branch --show-current 2>/dev/null || echo "unknown")

EOF

  # Analyze the diff for file changes
  local new_files=()
  local modified_files=()
  local deleted_files=()
  local renamed_files=()
  
  while IFS= read -r line; do
    if [[ $line =~ ^diff\ --git\ a/(.*)\ b/(.*) ]]; then
      local file_a="${BASH_REMATCH[1]}"
      local file_b="${BASH_REMATCH[2]}"
      
      # Check if it's a rename/move
      if [[ "$file_a" != "$file_b" ]]; then
        renamed_files+=("$file_a → $file_b")
      fi
    elif [[ $line =~ ^new\ file\ mode ]]; then
      # Get the filename from the previous diff line
      new_files+=("$file_b")
    elif [[ $line =~ ^deleted\ file\ mode ]]; then
      deleted_files+=("$file_a")
    elif [[ $line =~ ^index.*\.\. ]] && [[ "$file_a" == "$file_b" ]]; then
      modified_files+=("$file_a")
    fi
  done < "$diff_file"

  # Generate change summary
  echo "==================================================================" >> "$output_file"
  echo "📊 CHANGE SUMMARY" >> "$output_file"
  echo "==================================================================" >> "$output_file"
  
  local total_changes=$(( ${#new_files[@]} + ${#modified_files[@]} + ${#deleted_files[@]} + ${#renamed_files[@]} ))
  echo "Total files changed: $total_changes" >> "$output_file"
  echo "" >> "$output_file"

  if [[ ${#new_files[@]} -gt 0 ]]; then
    echo "🆕 NEW FILES (${#new_files[@]}):" >> "$output_file"
    printf '  • %s\n' "${new_files[@]}" >> "$output_file"
    echo "" >> "$output_file"
  fi

  if [[ ${#modified_files[@]} -gt 0 ]]; then
    echo "📝 MODIFIED FILES (${#modified_files[@]}):" >> "$output_file"
    printf '  • %s\n' "${modified_files[@]}" >> "$output_file"
    echo "" >> "$output_file"
  fi

  if [[ ${#deleted_files[@]} -gt 0 ]]; then
    echo "🗑️ DELETED FILES (${#deleted_files[@]}):" >> "$output_file"
    printf '  • %s\n' "${deleted_files[@]}" >> "$output_file"
    echo "" >> "$output_file"
  fi

  if [[ ${#renamed_files[@]} -gt 0 ]]; then
    echo "📦 RENAMED/MOVED FILES (${#renamed_files[@]}):" >> "$output_file"
    printf '  • %s\n' "${renamed_files[@]}" >> "$output_file"
    echo "" >> "$output_file"
  fi

  # File type analysis
  echo "==================================================================" >> "$output_file"
  echo "🏷️ FILE TYPE ANALYSIS" >> "$output_file"
  echo "==================================================================" >> "$output_file"
  
  _analyze_file_types "$diff_file" >> "$output_file"
  
  # Add the actual diff with file separators
  echo "==================================================================" >> "$output_file"
  echo "📋 DETAILED CHANGES" >> "$output_file"
  echo "==================================================================" >> "$output_file"
  echo "" >> "$output_file"

  # Process diff with file separators for better AI parsing
  local current_file=""
  while IFS= read -r line; do
    if [[ $line =~ ^diff\ --git\ a/(.*)\ b/(.*) ]]; then
      current_file="${BASH_REMATCH[2]}"
      echo "📁 FILE: $current_file" >> "$output_file"
      echo "─────────────────────────────────────────" >> "$output_file"
    fi
    echo "$line" >> "$output_file"
  done < "$diff_file"

  # Add AI analysis context
  echo "" >> "$output_file"
  echo "==================================================================" >> "$output_file"
  echo "🤖 AI ANALYSIS CONTEXT" >> "$output_file"
  echo "==================================================================" >> "$output_file"
  echo "Key areas for analysis:" >> "$output_file"
  echo "• Focus on test-related files (.spec.ts, .test.ts)" >> "$output_file"
  echo "• Look for type/interface changes that might break tests" >> "$output_file"
  echo "• Check for new functionality that needs test coverage" >> "$output_file"
  echo "• Identify breaking changes in method signatures" >> "$output_file"
  echo "• Review dependency changes and imports" >> "$output_file"
  echo "" >> "$output_file"
  echo "Change impact areas:" >> "$output_file"
  
  if [[ ${#new_files[@]} -gt 0 ]]; then
    echo "• New files may need comprehensive test coverage" >> "$output_file"
  fi
  if [[ ${#modified_files[@]} -gt 0 ]]; then
    echo "• Modified files may have broken existing tests" >> "$output_file"
  fi
  if [[ ${#deleted_files[@]} -gt 0 ]]; then
    echo "• Deleted files may have orphaned tests or dependencies" >> "$output_file"
  fi
}

# =========================================================================
# FUNCTION: _analyze_file_types
# =========================================================================
# Purpose: Analyzes changed files by type and provides AI context
# =========================================================================
_analyze_file_types() {
  local diff_file="$1"
  
  local ts_files=0
  local spec_files=0
  local html_files=0
  local css_files=0
  local json_files=0
  local other_files=0
  
  while IFS= read -r line; do
    if [[ $line =~ ^diff\ --git.*b/(.*) ]]; then
      local file="${BASH_REMATCH[1]}"
      case "$file" in
        *.spec.ts|*.test.ts) ((spec_files++)) ;;
        *.ts) ((ts_files++)) ;;
        *.html) ((html_files++)) ;;
        *.css|*.scss|*.sass) ((css_files++)) ;;
        *.json) ((json_files++)) ;;
        *) ((other_files++)) ;;
      esac
    fi
  done < "$diff_file"
  
  echo "TypeScript files: $ts_files"
  echo "Test files: $spec_files"
  echo "Templates: $html_files"
  echo "Styles: $css_files"
  echo "Config/JSON: $json_files"
  echo "Other: $other_files"
  echo ""
  
  # AI insights based on file types
  if [[ $spec_files -gt 0 ]]; then
    echo "🧪 Test files modified - may fix or introduce test issues"
  fi
  if [[ $ts_files -gt $spec_files ]]; then
    echo "⚠️  More source files than test files changed - check test coverage"
  fi
  if [[ $json_files -gt 0 ]]; then
    echo "⚙️  Configuration changes detected - may affect build/test setup"
  fi
}

# =========================================================================
# FUNCTION: _create_no_changes_output
# =========================================================================
# Purpose: Creates informative output when no changes are detected
# =========================================================================
_create_no_changes_output() {
  local output_file="$1"
  
  cat > "$output_file" << EOF
=================================================================
🔍 GIT DIFF ANALYSIS
=================================================================

STATUS: No changes detected
TIMESTAMP: $(date)
BRANCH: $(git branch --show-current 2>/dev/null || echo "unknown")

=================================================================
📊 REPOSITORY STATUS
=================================================================
Working directory: Clean
Staged changes: None
Last commit: $(git log -1 --oneline 2>/dev/null || echo "No commits")

=================================================================
🤖 AI ANALYSIS CONTEXT
=================================================================
No code changes were found to analyze. This could mean:
• Working directory is clean (all changes committed)
• You're analyzing test failures without recent changes
• Focus should be on existing code patterns or environment issues
• Consider checking if tests were recently updated in previous commits

Suggested actions:
• Review recent commit history: git log --oneline -10
• Check if issue is environment-related rather than code-related
• Examine test setup or configuration files
EOF
}