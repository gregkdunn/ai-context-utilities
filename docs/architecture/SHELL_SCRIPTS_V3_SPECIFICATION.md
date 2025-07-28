# AI Debug Context V3: Multi-Shell Scripts Specification

## Overview

This document provides comprehensive technical specifications for the AI Debug Context V3 shell scripts implementation, supporting Bash, Zsh, and Fish shells with consistent functionality and shell-specific optimizations.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Shell Compatibility Strategy](#shell-compatibility-strategy)
3. [Core Implementation](#core-implementation)
4. [Shell-Specific Features](#shell-specific-features)
5. [Installation & Setup](#installation--setup)
6. [API Reference](#api-reference)
7. [Testing Strategy](#testing-strategy)
8. [Migration Guide](#migration-guide)

## Architecture Overview

### Multi-Shell Design Pattern

```
shell-scripts/
├── common/                           # POSIX-compatible core functionality
│   ├── ai-debug-core.sh             # Main workflow orchestration
│   ├── modules/                     # Core modules (POSIX compatible)
│   │   ├── diff.sh                  # Git diff generation
│   │   ├── test.sh                  # Test execution
│   │   ├── ai-debug.sh              # AI analysis integration
│   │   └── pr-desc.sh               # PR description generation
│   ├── utils/                       # Utility functions
│   │   ├── config.sh                # Configuration management
│   │   ├── logging.sh               # Logging and output
│   │   ├── health.sh                # Health checking
│   │   └── git-utils.sh             # Git operations
│   └── lib/                         # Core libraries
│       ├── ai-providers.sh          # AI provider integrations
│       ├── nx-utils.sh              # NX workspace utilities
│       └── file-utils.sh            # File operations
├── shells/                          # Shell-specific optimizations
│   ├── bash/
│   │   ├── bash-init.sh             # Bash initialization
│   │   ├── bash-completions.sh      # Bash completion system
│   │   ├── bash-specific.sh         # Bash-only features
│   │   └── bash-arrays.sh           # Associative array utilities
│   ├── zsh/
│   │   ├── zsh-init.zsh             # Zsh initialization
│   │   ├── zsh-completions.zsh      # Rich Zsh completions
│   │   ├── zsh-specific.zsh         # Zsh-only features
│   │   ├── zsh-arrays.zsh           # Advanced array operations
│   │   └── zsh-glob.zsh             # Extended globbing patterns
│   └── fish/
│       ├── fish-init.fish           # Fish initialization
│       ├── fish-completions.fish    # Fish completion system
│       ├── fish-specific.fish       # Fish-only features
│       └── fish-config.fish         # Fish configuration
├── tests/                           # Cross-shell test suite
│   ├── unit/                        # Unit tests for each module
│   ├── integration/                 # Integration tests
│   ├── shell-specific/              # Shell-specific test cases
│   └── compatibility/               # Cross-shell compatibility tests
├── docs/                            # Shell scripts documentation
├── install.sh                       # Universal installer
└── uninstall.sh                     # Universal uninstaller
```

### Design Principles

1. **POSIX Core**: Maximum compatibility through POSIX-compliant core functions
2. **Progressive Enhancement**: Shell-specific optimizations layered on top
3. **Consistent API**: Identical command interface across all shells
4. **Graceful Degradation**: Advanced features degrade gracefully on basic shells
5. **Zero Dependencies**: Core functionality works without external tools

## Shell Compatibility Strategy

### Compatibility Matrix

| Feature | Bash 4.0+ | Bash 3.x | Zsh 5.0+ | Fish 3.0+ | POSIX |
|---------|-----------|----------|----------|-----------|-------|
| Core Workflow | ✅ | ✅ | ✅ | ✅ | ✅ |
| Associative Arrays | ✅ | ❌* | ✅ | ✅ | ❌ |
| Extended Globbing | ✅ | ✅ | ✅ | ✅ | ❌ |
| Command Completion | ✅ | ✅ | ✅ | ✅ | ❌ |
| Color Output | ✅ | ✅ | ✅ | ✅ | ✅ |
| Progress Indicators | ✅ | ✅ | ✅ | ✅ | ✅ |

*Fallback to indexed arrays or alternative implementation

### Shell Detection System

```bash
# Universal shell detection
detect_shell() {
  if [ -n "$FISH_VERSION" ]; then
    echo "fish"
  elif [ -n "$ZSH_VERSION" ]; then
    echo "zsh"
  elif [ -n "$BASH_VERSION" ]; then
    if [ "${BASH_VERSINFO[0]}" -ge 4 ]; then
      echo "bash4"
    else
      echo "bash3"
    fi
  else
    echo "posix"
  fi
}

# Load shell-specific enhancements
load_shell_features() {
  local shell_type
  shell_type=$(detect_shell)
  
  case "$shell_type" in
    "fish")
      source "$AI_DEBUG_HOME/shells/fish/fish-init.fish"
      ;;
    "zsh")
      source "$AI_DEBUG_HOME/shells/zsh/zsh-init.zsh"
      ;;
    "bash4"|"bash3")
      source "$AI_DEBUG_HOME/shells/bash/bash-init.sh"
      ;;
    "posix")
      # Use only POSIX-compatible features
      ;;
  esac
}
```

## Core Implementation

### Main Entry Point (POSIX Compatible)

```bash
#!/bin/sh
# ai-debug-core.sh - Main entry point for all shells

# Global configuration
AI_DEBUG_VERSION="3.0.0"
AI_DEBUG_HOME="${AI_DEBUG_HOME:-$HOME/.ai-debug-context}"
AI_DEBUG_CONFIG="${AI_DEBUG_CONFIG:-$AI_DEBUG_HOME/config}"
AI_DEBUG_OUTPUT="${AI_DEBUG_OUTPUT:-.github/instructions/ai_utilities_context}"

# Load core utilities
. "$AI_DEBUG_HOME/common/utils/logging.sh"
. "$AI_DEBUG_HOME/common/utils/config.sh"
. "$AI_DEBUG_HOME/common/utils/health.sh"

# Main aiDebug function (POSIX compatible)
aiDebug() {
  local project=""
  local modules="all"
  local mode="interactive"
  local ai_provider="auto"
  local output_format="text"
  local shell_features="auto"
  
  # Parse arguments (POSIX compatible)
  local watch_mode=""
  local watch_debounce="2"
  local watch_ignore=""
  local watch_include=""
  
  while [ $# -gt 0 ]; do
    case "$1" in
      --project=*)
        project="${1#*=}"
        ;;
      --modules=*)
        modules="${1#*=}"
        ;;
      --mode=*)
        mode="${1#*=}"
        ;;
      --ai=*)
        ai_provider="${1#*=}"
        ;;
      --format=*)
        output_format="${1#*=}"
        ;;
      --shell-features=*)
        shell_features="${1#*=}"
        ;;
      --watch)
        watch_mode="standard"
        ;;
      --watch=*)
        watch_mode="${1#*=}"
        ;;
      --watch-debounce=*)
        watch_debounce="${1#*=}"
        ;;
      --watch-ignore=*)
        watch_ignore="${1#*=}"
        ;;
      --watch-include=*)
        watch_include="${1#*=}"
        ;;
      --doctor)
        aiDebug_doctor "$@"
        return $?
        ;;
      --completion)
        shift
        aiDebug_setup_completion "$1"
        return $?
        ;;
      --help)
        aiDebug_help
        return 0
        ;;
      --version)
        echo "AI Debug Context v$AI_DEBUG_VERSION"
        return 0
        ;;
      -*)
        log_error "Unknown option: $1"
        aiDebug_help
        return 1
        ;;
      *)
        if [ -z "$project" ]; then
          project="$1"
        fi
        ;;
    esac
    shift
  done
  
  # Handle watch mode
  if [ -n "$watch_mode" ]; then
    aiDebug_watch_mode "$project" "$modules" "$mode" "$ai_provider" "$output_format" "$watch_mode" "$watch_debounce" "$watch_ignore" "$watch_include"
    return $?
  fi
  
  # Initialize shell-specific features
  if [ "$shell_features" = "auto" ]; then
    load_shell_features
  fi
  
  # Health check
  if ! aiDebug_health_check_quick; then
    log_error "Health check failed. Run 'aiDebug --doctor' for detailed diagnostics."
    return 1
  fi
  
  # Auto-detect project if not specified
  if [ -z "$project" ]; then
    project=$(aiDebug_auto_detect_project)
    if [ -z "$project" ]; then
      log_error "No NX project detected. Use 'aiDebug --help' for usage."
      return 1
    fi
    log_info "Auto-detected project: $project"
  fi
  
  # Execute workflow
  log_info "Starting AI Debug Context workflow..."
  aiDebug_execute_workflow "$project" "$modules" "$mode" "$ai_provider" "$output_format"
  
  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    log_success "Workflow completed successfully"
  else
    log_error "Workflow failed with exit code $exit_code"
  fi
  
  return $exit_code
}

# Workflow execution engine
aiDebug_execute_workflow() {
  local project="$1"
  local modules="$2"
  local mode="$3"
  local ai_provider="$4"
  local output_format="$5"
  
  local start_time
  start_time=$(date +%s)
  
  # Create output directory
  mkdir -p "$AI_DEBUG_OUTPUT"
  
  # Initialize workflow context
  local context_file="$AI_DEBUG_OUTPUT/workflow-context.json"
  aiDebug_init_context "$context_file" "$project" "$modules" "$mode"
  
  # Execute modules based on selection
  case "$modules" in
    "all"|"*")
      aiDebug_execute_module "diff" "$context_file" &&
      aiDebug_execute_module "test" "$context_file" &&
      aiDebug_execute_module "ai-debug" "$context_file" &&
      aiDebug_execute_module "pr-desc" "$context_file"
      ;;
    *)
      # Parse comma-separated modules
      local IFS=','
      for module in $modules; do
        aiDebug_execute_module "$module" "$context_file" || return $?
      done
      ;;
  esac
  
  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  # Generate final report
  aiDebug_generate_report "$context_file" "$duration" "$output_format"
  
  return 0
}
```

### Module System (POSIX Compatible)

```bash
# Module execution framework
aiDebug_execute_module() {
  local module="$1"
  local context_file="$2"
  
  log_info "Executing module: $module"
  
  case "$module" in
    "diff")
      . "$AI_DEBUG_HOME/common/modules/diff.sh"
      execute_diff_module "$context_file"
      ;;
    "test")
      . "$AI_DEBUG_HOME/common/modules/test.sh"
      execute_test_module "$context_file"
      ;;
    "ai-debug")
      . "$AI_DEBUG_HOME/common/modules/ai-debug.sh"
      execute_ai_debug_module "$context_file"
      ;;
    "pr-desc")
      . "$AI_DEBUG_HOME/common/modules/pr-desc.sh"
      execute_pr_desc_module "$context_file"
      ;;
    *)
      log_error "Unknown module: $module"
      return 1
      ;;
  esac
}

# Context management
aiDebug_init_context() {
  local context_file="$1"
  local project="$2"
  local modules="$3"
  local mode="$4"
  
  cat > "$context_file" << EOF
{
  "version": "$AI_DEBUG_VERSION",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "shell": "$(detect_shell)",
  "project": "$project",
  "modules": "$modules",
  "mode": "$mode",
  "workspace": "$(pwd)",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "results": {}
}
EOF
}

# Watch Mode Implementation
aiDebug_watch_mode() {
  local project="$1"
  local modules="$2"
  local mode="$3"
  local ai_provider="$4"
  local output_format="$5"
  local watch_type="$6"
  local debounce_time="$7"
  local ignore_patterns="$8"
  local include_patterns="$9"
  
  log_info "Starting AI Debug Context in watch mode..."
  log_info "Watch type: $watch_type"
  log_info "Debounce: ${debounce_time}s"
  
  # Initialize watch configuration
  aiDebug_init_watch_config "$project" "$watch_type" "$ignore_patterns" "$include_patterns"
  
  # Display initial status
  aiDebug_watch_status_display
  
  # Set up signal handlers for clean exit
  trap 'aiDebug_cleanup_watch; exit 0' INT TERM
  
  # Initial run
  log_info "Running initial workflow..."
  aiDebug_execute_workflow "$project" "$modules" "$mode" "$ai_provider" "$output_format"
  
  # Start file watching
  case "$watch_type" in
    "quick")
      aiDebug_watch_quick "$project" "$modules" "$mode" "$ai_provider" "$output_format" "$debounce_time"
      ;;
    "smart")
      aiDebug_watch_smart "$project" "$modules" "$mode" "$ai_provider" "$output_format" "$debounce_time"
      ;;
    "standard"|*)
      aiDebug_watch_standard "$project" "$modules" "$mode" "$ai_provider" "$output_format" "$debounce_time"
      ;;
  esac
}

# Standard watch mode using available tools
aiDebug_watch_standard() {
  local project="$1"
  local modules="$2"
  local mode="$3"
  local ai_provider="$4"
  local output_format="$5"
  local debounce_time="$6"
  
  # Try different file watching tools in order of preference
  if command -v fswatch >/dev/null 2>&1; then
    aiDebug_watch_with_fswatch "$@"
  elif command -v inotifywait >/dev/null 2>&1; then
    aiDebug_watch_with_inotify "$@"
  elif command -v watchman >/dev/null 2>&1; then
    aiDebug_watch_with_watchman "$@"
  else
    # Fallback to polling
    log_warn "No file watching tool found. Using polling mode (slower)"
    aiDebug_watch_with_polling "$@"
  fi
}

# FSWatch implementation (macOS/Linux)
aiDebug_watch_with_fswatch() {
  local project="$1"
  local modules="$2" 
  local mode="$3"
  local ai_provider="$4"
  local output_format="$5"
  local debounce_time="$6"
  
  local watch_paths
  watch_paths=$(aiDebug_get_watch_paths "$project")
  
  log_info "Watching for file changes using fswatch..."
  
  # Use fswatch with debouncing and filtering
  fswatch -0 -r -l "$debounce_time" \
    --exclude='node_modules' \
    --exclude='\.git' \
    --exclude='dist' \
    --exclude='coverage' \
    --include='\.ts$' \
    --include='\.js$' \
    --include='\.json$' \
    --include='\.spec\.ts$' \
    $watch_paths | while IFS= read -r -d '' file; do
      
      log_info "File changed: $(basename "$file")"
      aiDebug_handle_file_change "$file" "$project" "$modules" "$mode" "$ai_provider" "$output_format"
  done
}

# inotify implementation (Linux)
aiDebug_watch_with_inotify() {
  local project="$1"
  local modules="$2"
  local mode="$3"
  local ai_provider="$4"
  local output_format="$5"
  local debounce_time="$6"
  
  local watch_paths
  watch_paths=$(aiDebug_get_watch_paths "$project")
  
  log_info "Watching for file changes using inotifywait..."
  
  # Monitor for file modifications
  inotifywait -m -r -e modify,create,delete,move \
    --exclude '(node_modules|\.git|dist|coverage)' \
    --format '%w%f %e' \
    $watch_paths | while read file event; do
      
      # Filter for relevant file types
      case "$file" in
        *.ts|*.js|*.json|*.spec.ts)
          log_info "File $event: $(basename "$file")"
          
          # Simple debouncing
          sleep "$debounce_time"
          
          aiDebug_handle_file_change "$file" "$project" "$modules" "$mode" "$ai_provider" "$output_format"
          ;;
      esac
  done
}

# Polling fallback implementation
aiDebug_watch_with_polling() {
  local project="$1"
  local modules="$2"
  local mode="$3"
  local ai_provider="$4"
  local output_format="$5"
  local debounce_time="$6"
  
  local watch_paths
  watch_paths=$(aiDebug_get_watch_paths "$project")
  
  local last_check
  last_check=$(date +%s)
  
  log_info "Using polling mode (checking every ${debounce_time}s)..."
  
  while true; do
    sleep "$debounce_time"
    
    local current_time
    current_time=$(date +%s)
    
    # Find files modified since last check
    local changed_files
    changed_files=$(find $watch_paths -type f \
      \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.spec.ts" \) \
      -not -path "*/node_modules/*" \
      -not -path "*/.git/*" \
      -not -path "*/dist/*" \
      -not -path "*/coverage/*" \
      -newer /tmp/aiDebug_last_check 2>/dev/null || true)
    
    if [ -n "$changed_files" ]; then
      log_info "Files changed since last check:"
      echo "$changed_files" | while IFS= read -r file; do
        log_info "  $(basename "$file")"
      done
      
      aiDebug_handle_file_change "" "$project" "$modules" "$mode" "$ai_provider" "$output_format"
    fi
    
    # Update timestamp file
    touch -t "$(date -d "@$current_time" +%Y%m%d%H%M.%S)" /tmp/aiDebug_last_check 2>/dev/null || true
  done
}

# Smart watch mode with intelligent triggering
aiDebug_watch_smart() {
  local project="$1"
  local modules="$2"
  local mode="$3"
  local ai_provider="$4"
  local output_format="$5"
  local debounce_time="$6"
  
  log_info "Starting smart watch mode with intelligent triggering..."
  
  # Track file types and trigger appropriate modules
  export AI_DEBUG_SMART_WATCH=1
  
  # Use standard watching but with smart handling
  aiDebug_watch_standard "$@"
}

# Quick watch mode for rapid development
aiDebug_watch_quick() {
  local project="$1"
  local modules="$2"
  local mode="$3"
  local ai_provider="$4"
  local output_format="$5"
  local debounce_time="$6"
  
  log_info "Starting quick watch mode (tests only, faster execution)..."
  
  # Override modules to focus on tests for speed
  local quick_modules="test"
  local quick_mode="quick"
  
  # Use shorter debounce time
  local quick_debounce="1"
  
  aiDebug_watch_standard "$project" "$quick_modules" "$quick_mode" "$ai_provider" "$output_format" "$quick_debounce"
}

# Handle file change events
aiDebug_handle_file_change() {
  local changed_file="$1"
  local project="$2"
  local modules="$3"
  local mode="$4"
  local ai_provider="$5"
  local output_format="$6"
  
  # Smart module selection based on file type
  if [ -n "$AI_DEBUG_SMART_WATCH" ]; then
    modules=$(aiDebug_smart_module_selection "$changed_file" "$modules")
  fi
  
  # Clear previous output and show status
  aiDebug_watch_clear_output
  aiDebug_watch_status_update "running"
  
  log_info "Re-running workflow due to file changes..."
  
  # Execute workflow with timestamp
  local start_time
  start_time=$(date +%s)
  
  if aiDebug_execute_workflow "$project" "$modules" "$mode" "$ai_provider" "$output_format"; then
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    aiDebug_watch_status_update "success" "$duration"
    log_success "Workflow completed in ${duration}s"
  else
    aiDebug_watch_status_update "error"
    log_error "Workflow failed"
  fi
  
  # Show watching status
  aiDebug_watch_status_display
}

# Smart module selection based on file changes
aiDebug_smart_module_selection() {
  local changed_file="$1"
  local default_modules="$2"
  
  case "$changed_file" in
    *.spec.ts|*.test.ts)
      echo "test,ai-debug"
      ;;
    *.ts|*.js)
      echo "test,diff,ai-debug"
      ;;
    *.json)
      if [ "$(basename "$changed_file")" = "package.json" ]; then
        echo "all"
      else
        echo "diff"
      fi
      ;;
    *)
      echo "$default_modules"
      ;;
  esac
}

# Watch configuration and utilities
aiDebug_init_watch_config() {
  local project="$1"
  local watch_type="$2"
  local ignore_patterns="$3"
  local include_patterns="$4"
  
  # Create watch state directory
  mkdir -p "$AI_DEBUG_HOME/watch"
  
  # Save watch configuration
  cat > "$AI_DEBUG_HOME/watch/config" << EOF
project=$project
watch_type=$watch_type
ignore_patterns=$ignore_patterns
include_patterns=$include_patterns
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
pid=$$
EOF
  
  # Initialize watch statistics
  cat > "$AI_DEBUG_HOME/watch/stats" << EOF
runs=0
successes=0
failures=0
total_time=0
EOF
}

aiDebug_get_watch_paths() {
  local project="$1"
  
  # Default paths to watch
  local paths="src apps libs"
  
  # Add project-specific paths if specified
  if [ -n "$project" ] && [ "$project" != "auto-detect" ]; then
    if [ -d "apps/$project" ]; then
      paths="$paths apps/$project"
    fi
    if [ -d "libs/$project" ]; then
      paths="$paths libs/$project"
    fi
  fi
  
  # Filter to existing paths
  local existing_paths=""
  for path in $paths; do
    if [ -d "$path" ]; then
      existing_paths="$existing_paths $path"
    fi
  done
  
  echo "$existing_paths"
}

# Watch status display and management
aiDebug_watch_status_display() {
  local status_file="$AI_DEBUG_HOME/watch/stats"
  
  if [ -f "$status_file" ]; then
    local runs successes failures total_time
    
    # Read statistics (POSIX compatible)
    while IFS='=' read -r key value; do
      case "$key" in
        runs) runs="$value" ;;
        successes) successes="$value" ;;
        failures) failures="$value" ;;
        total_time) total_time="$value" ;;
      esac
    done < "$status_file"
    
    log_info "📊 Watch Statistics: $runs runs, $successes successes, $failures failures"
    if [ "$runs" -gt 0 ]; then
      local avg_time=$((total_time / runs))
      log_info "⏱️  Average execution time: ${avg_time}s"
    fi
  fi
  
  log_info "👀 Watching for file changes... (Press Ctrl+C to stop)"
}

aiDebug_watch_status_update() {
  local status="$1"
  local duration="$2"
  local status_file="$AI_DEBUG_HOME/watch/stats"
  
  if [ -f "$status_file" ]; then
    # Read current stats
    local runs=0 successes=0 failures=0 total_time=0
    
    while IFS='=' read -r key value; do
      case "$key" in
        runs) runs="$value" ;;
        successes) successes="$value" ;;
        failures) failures="$value" ;;
        total_time) total_time="$value" ;;
      esac
    done < "$status_file"
    
    # Update stats
    runs=$((runs + 1))
    
    case "$status" in
      "success")
        successes=$((successes + 1))
        if [ -n "$duration" ]; then
          total_time=$((total_time + duration))
        fi
        ;;
      "error")
        failures=$((failures + 1))
        ;;
    esac
    
    # Write updated stats  
    cat > "$status_file" << EOF
runs=$runs
successes=$successes
failures=$failures
total_time=$total_time
EOF
  fi
}

aiDebug_watch_clear_output() {
  # Clear terminal output for cleaner watch experience
  if [ -t 1 ]; then
    printf '\33[2K\r'  # Clear current line
    printf '\33[H\33[2J'  # Clear screen (optional)
  fi
}

aiDebug_cleanup_watch() {
  log_info "Stopping watch mode..."
  
  # Clean up watch state
  rm -f "$AI_DEBUG_HOME/watch/config"
  
  # Kill any background processes
  local watch_pid
  if [ -f "$AI_DEBUG_HOME/watch/pid" ]; then
    watch_pid=$(cat "$AI_DEBUG_HOME/watch/pid")
    if [ -n "$watch_pid" ]; then
      kill "$watch_pid" 2>/dev/null || true
    fi
    rm -f "$AI_DEBUG_HOME/watch/pid"
  fi
  
  log_success "Watch mode stopped"
}
```

## Shell-Specific Features

### Bash-Specific Optimizations

```bash
# bash-specific.sh - Bash 4.0+ optimizations
[ "${BASH_VERSINFO[0]}" -lt 4 ] && return 0

# Associative arrays for better data management
declare -A AI_DEBUG_CONFIG_MAP
declare -A AI_DEBUG_RESULTS

# Enhanced completion system
_aiDebug_completion() {
  local cur prev opts
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  
  opts="--project --modules --mode --ai --format --doctor --help --version --completion"
  
  case "$prev" in
    --modules)
      COMPREPLY=($(compgen -W "all diff test ai-debug pr-desc" -- "$cur"))
      return 0
      ;;
    --mode)
      COMPREPLY=($(compgen -W "interactive quick batch" -- "$cur"))
      return 0
      ;;
    --ai)
      COMPREPLY=($(compgen -W "auto copilot clipboard custom" -- "$cur"))
      return 0
      ;;
    --format)
      COMPREPLY=($(compgen -W "text json markdown html" -- "$cur"))
      return 0
      ;;
  esac
  
  if [[ "$cur" == --* ]]; then
    COMPREPLY=($(compgen -W "$opts" -- "$cur"))
    return 0
  fi
  
  # Complete with NX project names
  local projects
  projects=$(aiDebug_list_projects 2>/dev/null)
  COMPREPLY=($(compgen -W "$projects" -- "$cur"))
}

complete -F _aiDebug_completion aiDebug

# Bash-specific array utilities
bash_array_contains() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    [[ "$item" == "$needle" ]] && return 0
  done
  return 1
}

# Process substitution for efficient data processing
bash_process_large_output() {
  local output_file="$1"
  local filter_function="$2"
  
  while IFS= read -r line; do
    "$filter_function" "$line"
  done < <(cat "$output_file")
}
```

### Zsh-Specific Optimizations

```zsh
# zsh-specific.zsh - Zsh 5.0+ optimizations
autoload -U colors && colors

# Zsh associative arrays (more powerful than bash)
typeset -A ai_debug_config
typeset -A ai_debug_results
typeset -a ai_debug_modules

# Advanced completion system
_aiDebug_zsh_completion() {
  local context state line
  typeset -A opt_args
  
  _arguments \
    '--project[Specify NX project]:project:_aiDebug_projects' \
    '--modules[Specify modules to run]:modules:_aiDebug_modules' \
    '--mode[Execution mode]:mode:(interactive quick batch)' \
    '--ai[AI provider]:provider:(auto copilot clipboard custom)' \
    '--format[Output format]:format:(text json markdown html)' \
    '--shell-features[Shell feature level]:level:(auto basic advanced)' \
    '--doctor[Run health diagnostics]' \
    '--completion[Setup completion]:shell:(bash zsh fish)' \
    '--help[Show help]' \
    '--version[Show version]' \
    '*:project:_aiDebug_projects'
}

_aiDebug_projects() {
  local projects
  projects=(${(f)"$(aiDebug_list_projects 2>/dev/null)"})
  _describe 'NX projects' projects
}

_aiDebug_modules() {
  local modules
  modules=(
    'all:Execute all modules'
    'diff:Git diff generation'
    'test:Test execution'
    'ai-debug:AI-powered debugging'
    'pr-desc:PR description generation'
  )
  _describe 'Available modules' modules
}

compdef _aiDebug_zsh_completion aiDebug

# Zsh extended globbing
setopt EXTENDED_GLOB

# Advanced array operations
zsh_array_unique() {
  local -a result
  local item
  for item in "$@"; do
    [[ ${result[(Ie)$item]} -eq 0 ]] && result+="$item"
  done
  print -l "$result[@]"
}

# Pattern matching utilities
zsh_match_pattern() {
  local pattern="$1"
  local text="$2"
  [[ "$text" == ${~pattern} ]]
}

# Efficient file processing with zsh
zsh_process_files() {
  local pattern="$1"
  local action="$2"
  local file
  
  for file in ${~pattern}; do
    [[ -f "$file" ]] && "$action" "$file"
  done
}
```

### Fish-Specific Optimizations

```fish
# fish-specific.fish - Fish 3.0+ optimizations

# Fish functions for AI Debug Context
function aiDebug_fish_init
    # Fish-specific initialization
    set -g AI_DEBUG_FISH_VERSION (fish --version | cut -d' ' -f3)
    
    # Fish abbreviations for common commands
    abbr -a aid aiDebug
    abbr -a aidd 'aiDebug --doctor'
    abbr -a aidq 'aiDebug --mode quick'
end

# Enhanced Fish completions
complete -c aiDebug -l project -d "Specify NX project" -a "(aiDebug_list_projects 2>/dev/null)"
complete -c aiDebug -l modules -d "Specify modules" -a "all diff test ai-debug pr-desc"
complete -c aiDebug -l mode -d "Execution mode" -a "interactive quick batch"
complete -c aiDebug -l ai -d "AI provider" -a "auto copilot clipboard custom"
complete -c aiDebug -l format -d "Output format" -a "text json markdown html"
complete -c aiDebug -l doctor -d "Run health diagnostics"
complete -c aiDebug -l help -d "Show help"
complete -c aiDebug -l version -d "Show version"

# Fish-specific utilities
function fish_array_contains
    set -l needle $argv[1]
    set -l haystack $argv[2..-1]
    
    for item in $haystack
        if test "$item" = "$needle"
            return 0
        end
    end
    return 1
end

# Efficient file processing
function fish_process_files
    set -l pattern $argv[1]
    set -l action $argv[2]
    
    for file in (eval "ls $pattern" 2>/dev/null)
        if test -f "$file"
            eval "$action '$file'"
        end
    end
end

# Fish-specific configuration
function aiDebug_fish_config
    # Set Fish-specific variables
    set -g AI_DEBUG_FISH_MODE 1
    set -g AI_DEBUG_USE_COLORS 1
    
    # Fish event handlers
    function __aiDebug_pwd_handler --on-variable PWD
        # Auto-detect NX workspace changes
        if test -f "nx.json"
            set -g AI_DEBUG_CURRENT_WORKSPACE (pwd)
        end
    end
end
```

## Installation & Setup

### Universal Installer

```bash
#!/bin/sh
# install.sh - Universal installer for all supported shells

AI_DEBUG_INSTALL_DIR="${AI_DEBUG_INSTALL_DIR:-$HOME/.ai-debug-context}"
AI_DEBUG_VERSION="3.0.0"

# Colors for output (if supported)
if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
  RED=$(tput setaf 1)
  GREEN=$(tput setaf 2)
  YELLOW=$(tput setaf 3)
  BLUE=$(tput setaf 4)
  RESET=$(tput sgr0)
else
  RED="" GREEN="" YELLOW="" BLUE="" RESET=""
fi

log_info() { printf "%s[INFO]%s %s\n" "$BLUE" "$RESET" "$1"; }
log_success() { printf "%s[SUCCESS]%s %s\n" "$GREEN" "$RESET" "$1"; }
log_warn() { printf "%s[WARN]%s %s\n" "$YELLOW" "$RESET" "$1"; }
log_error() { printf "%s[ERROR]%s %s\n" "$RED" "$RESET" "$1"; }

# Detect shell and OS
detect_shell() {
  if [ -n "$FISH_VERSION" ]; then
    echo "fish"
  elif [ -n "$ZSH_VERSION" ]; then
    echo "zsh"
  elif [ -n "$BASH_VERSION" ]; then
    echo "bash"
  else
    echo "sh"
  fi
}

detect_os() {
  case "$(uname -s)" in
    Darwin*) echo "macos" ;;
    Linux*) echo "linux" ;;
    CYGWIN*|MINGW*|MSYS*) echo "windows" ;;
    *) echo "unknown" ;;
  esac
}

# Installation functions
install_core() {
  log_info "Installing AI Debug Context v$AI_DEBUG_VERSION..."
  
  # Create installation directory
  mkdir -p "$AI_DEBUG_INSTALL_DIR"
  
  # Download or copy files (placeholder for actual implementation)
  if command -v curl >/dev/null 2>&1; then
    log_info "Downloading core files..."
    # curl -sSL "https://github.com/user/ai-debug-context/archive/v$AI_DEBUG_VERSION.tar.gz" | tar -xz -C "$AI_DEBUG_INSTALL_DIR" --strip-components=1
  elif command -v wget >/dev/null 2>&1; then
    log_info "Downloading core files..."
    # wget -qO- "https://github.com/user/ai-debug-context/archive/v$AI_DEBUG_VERSION.tar.gz" | tar -xz -C "$AI_DEBUG_INSTALL_DIR" --strip-components=1
  else
    log_warn "Neither curl nor wget found. Please install manually."
    return 1
  fi
  
  # Make scripts executable
  find "$AI_DEBUG_INSTALL_DIR" -name "*.sh" -exec chmod +x {} \;
  find "$AI_DEBUG_INSTALL_DIR" -name "*.zsh" -exec chmod +x {} \;
  find "$AI_DEBUG_INSTALL_DIR" -name "*.fish" -exec chmod +x {} \;
  
  log_success "Core installation completed"
}

setup_shell_integration() {
  local shell="$1"
  local shell_rc=""
  local source_line=""
  
  case "$shell" in
    "bash")
      if [ -f "$HOME/.bashrc" ]; then
        shell_rc="$HOME/.bashrc"
      elif [ -f "$HOME/.bash_profile" ]; then
        shell_rc="$HOME/.bash_profile"
      else
        shell_rc="$HOME/.bashrc"
        touch "$shell_rc"
      fi
      source_line="source '$AI_DEBUG_INSTALL_DIR/common/ai-debug-core.sh'"
      ;;
    "zsh")
      shell_rc="$HOME/.zshrc"
      [ ! -f "$shell_rc" ] && touch "$shell_rc"
      source_line="source '$AI_DEBUG_INSTALL_DIR/common/ai-debug-core.sh'"
      ;;
    "fish")
      shell_rc="$HOME/.config/fish/config.fish"
      mkdir -p "$(dirname "$shell_rc")"
      [ ! -f "$shell_rc" ] && touch "$shell_rc"
      source_line="source '$AI_DEBUG_INSTALL_DIR/common/ai-debug-core.sh'"
      ;;
    *)
      log_warn "Shell '$shell' not fully supported. Manual setup required."
      return 1
      ;;
  esac
  
  # Check if already configured
  if grep -q "ai-debug-core.sh" "$shell_rc" 2>/dev/null; then
    log_warn "AI Debug Context already configured in $shell_rc"
    return 0
  fi
  
  # Add source line
  log_info "Configuring $shell integration in $shell_rc"
  {
    echo ""
    echo "# AI Debug Context v$AI_DEBUG_VERSION"
    echo "$source_line"
  } >> "$shell_rc"
  
  log_success "$shell integration configured"
}

setup_completions() {
  local shell="$1"
  
  case "$shell" in
    "bash")
      setup_bash_completions
      ;;
    "zsh")
      setup_zsh_completions
      ;;
    "fish")
      setup_fish_completions
      ;;
  esac
}

setup_bash_completions() {
  local completion_dir=""
  
  # Find bash completions directory
  if [ -d "/usr/local/etc/bash_completion.d" ]; then
    completion_dir="/usr/local/etc/bash_completion.d"
  elif [ -d "/etc/bash_completion.d" ]; then
    completion_dir="/etc/bash_completion.d"
  elif [ -d "$HOME/.bash_completion.d" ]; then
    completion_dir="$HOME/.bash_completion.d"
  else
    mkdir -p "$HOME/.bash_completion.d"
    completion_dir="$HOME/.bash_completion.d"
  fi
  
  # Install completion script
  if [ -w "$completion_dir" ]; then
    cp "$AI_DEBUG_INSTALL_DIR/shells/bash/bash-completions.sh" "$completion_dir/aiDebug"
    log_success "Bash completions installed"
  else
    log_warn "Cannot install system-wide bash completions. Run with sudo for system installation."
  fi
}

setup_zsh_completions() {
  local fpath_dir="$HOME/.zsh/completions"
  mkdir -p "$fpath_dir"
  
  cp "$AI_DEBUG_INSTALL_DIR/shells/zsh/zsh-completions.zsh" "$fpath_dir/_aiDebug"
  
  # Add to fpath if not already present
  local zshrc="$HOME/.zshrc"
  if ! grep -q "$fpath_dir" "$zshrc" 2>/dev/null; then
    echo "fpath=('$fpath_dir' \$fpath)" >> "$zshrc"
  fi
  
  log_success "Zsh completions installed"
}

setup_fish_completions() {
  local completion_dir="$HOME/.config/fish/completions"
  mkdir -p "$completion_dir"
  
  cp "$AI_DEBUG_INSTALL_DIR/shells/fish/fish-completions.fish" "$completion_dir/aiDebug.fish"
  log_success "Fish completions installed"
}

# Health check
check_dependencies() {
  log_info "Checking dependencies..."
  
  local missing_deps=""
  
  # Check required tools
  for tool in git node npm; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      missing_deps="$missing_deps $tool"
    fi
  done
  
  if [ -n "$missing_deps" ]; then
    log_error "Missing required dependencies:$missing_deps"
    log_info "Please install the missing tools and run the installer again."
    return 1
  fi
  
  # Check optional tools
  local optional_tools="gh jq curl"
  for tool in $optional_tools; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      log_warn "Optional tool '$tool' not found. Some features may be limited."
    fi
  done
  
  log_success "Dependencies check completed"
}

# Main installation
main() {
  local current_shell
  current_shell=$(detect_shell)
  
  log_info "AI Debug Context v$AI_DEBUG_VERSION Installer"
  log_info "Detected shell: $current_shell"
  log_info "Installation directory: $AI_DEBUG_INSTALL_DIR"
  
  # Confirm installation
  printf "Continue with installation? [y/N] "
  read -r confirm
  case "$confirm" in
    [yY]|[yY][eE][sS])
      ;;
    *)
      log_info "Installation cancelled"
      exit 0
      ;;
  esac
  
  # Run installation steps
  check_dependencies || exit 1
  install_core || exit 1
  setup_shell_integration "$current_shell" || exit 1
  setup_completions "$current_shell"
  
  log_success "Installation completed successfully!"
  log_info "Please restart your shell or run 'source ~/.${current_shell}rc' to activate AI Debug Context"
  log_info "Run 'aiDebug --help' to get started"
}

# Run main function
main "$@"
```

## API Reference

### Core Commands

```bash
# Main command with all options
aiDebug [PROJECT] [OPTIONS]

# Core Options:
--project=PROJECT          # Specify NX project name
--modules=MODULE1,MODULE2   # Comma-separated module list (all,diff,test,ai-debug,pr-desc)
--mode=MODE                # Execution mode (interactive,quick,batch)
--ai=PROVIDER              # AI provider (auto,copilot,clipboard,custom)
--format=FORMAT            # Output format (text,json,markdown,html)
--shell-features=LEVEL     # Shell feature level (auto,basic,advanced)

# Watch Mode Options:
--watch                    # Enable standard watch mode
--watch=TYPE               # Watch mode type (standard,quick,smart)
--watch-debounce=SECONDS   # Debounce time between file changes (default: 2)
--watch-ignore=PATTERNS    # Comma-separated ignore patterns
--watch-include=PATTERNS   # Comma-separated include patterns

# Utility Options:
--doctor                   # Run comprehensive health diagnostics
--completion=SHELL         # Install completions for shell (bash,zsh,fish)
--help                     # Show help information
--version                  # Show version information

# Basic Examples:
aiDebug                               # Auto-detect project, run all modules
aiDebug my-app                        # Run all modules for specific project
aiDebug my-app --modules=diff,test    # Run specific modules
aiDebug --mode=quick --format=json   # Quick mode with JSON output
aiDebug --doctor                      # Health check and diagnostics

# Watch Mode Examples:
aiDebug my-app --watch                # Standard watch mode
aiDebug --watch=quick                 # Quick watch (tests only, 1s debounce)
aiDebug --watch=smart --modules=test  # Smart watch with intelligent module selection
aiDebug --watch --watch-debounce=5    # Custom debounce time
aiDebug --watch --watch-ignore=*.log,*.tmp  # Ignore specific patterns
```

### Module-Specific Commands

```bash
# Direct module execution (advanced usage)
aiDebug_diff [OPTIONS]        # Git diff generation only
aiDebug_test [OPTIONS]        # Test execution only  
aiDebug_ai_debug [OPTIONS]    # AI analysis only
aiDebug_pr_desc [OPTIONS]     # PR description only

# Health and maintenance
aiDebug_doctor               # Comprehensive health check
aiDebug_doctor --fix         # Auto-fix common issues
aiDebug_update              # Update to latest version
aiDebug_uninstall           # Complete uninstallation
```

### Configuration Commands

```bash
# Configuration management
aiDebug config get KEY              # Get configuration value
aiDebug config set KEY VALUE        # Set configuration value
aiDebug config list                 # List all configuration
aiDebug config reset                # Reset to defaults

# Environment information
aiDebug env                         # Show environment information
aiDebug env --export               # Export environment variables
aiDebug env --check                # Validate environment
```

## Testing Strategy

### Multi-Shell Test Suite

```bash
#!/bin/sh
# tests/run-tests.sh - Cross-shell test runner

TEST_DIR="$(dirname "$0")"
AI_DEBUG_HOME="$(dirname "$TEST_DIR")"

# Test configuration
SHELLS_TO_TEST="bash zsh fish"
TEST_CATEGORIES="unit integration compatibility"

# Colors for test output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_test() { printf "${BLUE}[TEST]${NC} %s\n" "$1"; }
log_pass() { printf "${GREEN}[PASS]${NC} %s\n" "$1"; }
log_fail() { printf "${RED}[FAIL]${NC} %s\n" "$1"; }
log_skip() { printf "${YELLOW}[SKIP]${NC} %s\n" "$1"; }

# Test runners for each shell
run_bash_tests() {
  log_test "Running Bash tests..."
  if command -v bash >/dev/null 2>&1; then
    bash "$TEST_DIR/shell-specific/test-bash.sh"
  else
    log_skip "Bash not available"
    return 0
  fi
}

run_zsh_tests() {
  log_test "Running Zsh tests..."
  if command -v zsh >/dev/null 2>&1; then
    zsh "$TEST_DIR/shell-specific/test-zsh.sh"
  else
    log_skip "Zsh not available"
    return 0
  fi
}

run_fish_tests() {
  log_test "Running Fish tests..."
  if command -v fish >/dev/null 2>&1; then
    fish "$TEST_DIR/shell-specific/test-fish.fish"
  else
    log_skip "Fish not available"
    return 0
  fi
}

# Cross-shell compatibility tests
run_compatibility_tests() {
  log_test "Running cross-shell compatibility tests..."
  
  local test_project="test-nx-app"
  local test_output="/tmp/ai-debug-test-output"
  
  # Clean up
  rm -rf "$test_output"
  
  # Test each shell with same input
  for shell in $SHELLS_TO_TEST; do
    if command -v "$shell" >/dev/null 2>&1; then
      log_test "Testing $shell compatibility..."
      
      # Run same command in different shells
      case "$shell" in
        "bash")
          bash -c ". '$AI_DEBUG_HOME/common/ai-debug-core.sh'; aiDebug '$test_project' --mode=quick --format=json" > "$test_output.$shell.json"
          ;;
        "zsh")
          zsh -c ". '$AI_DEBUG_HOME/common/ai-debug-core.sh'; aiDebug '$test_project' --mode=quick --format=json" > "$test_output.$shell.json"
          ;;
        "fish")
          fish -c "source '$AI_DEBUG_HOME/common/ai-debug-core.sh'; aiDebug '$test_project' --mode=quick --format=json" > "$test_output.$shell.json"
          ;;
      esac
      
      # Validate output format consistency
      if [ -f "$test_output.$shell.json" ] && jq empty "$test_output.$shell.json" 2>/dev/null; then
        log_pass "$shell output format valid"
      else
        log_fail "$shell output format invalid"
      fi
    fi
  done
  
  # Compare outputs for consistency
  if [ -f "$test_output.bash.json" ] && [ -f "$test_output.zsh.json" ]; then
    if jq -S . "$test_output.bash.json" | cmp -s - <(jq -S . "$test_output.zsh.json"); then
      log_pass "Bash and Zsh outputs consistent"
    else
      log_fail "Bash and Zsh outputs differ"
    fi
  fi
}

# Main test execution
main() {
  log_test "AI Debug Context v3 Multi-Shell Test Suite"
  log_test "Testing shells: $SHELLS_TO_TEST"
  
  local total_tests=0
  local passed_tests=0
  local failed_tests=0
  
  # Run shell-specific tests
  for shell in $SHELLS_TO_TEST; do
    case "$shell" in
      "bash") run_bash_tests ;;
      "zsh") run_zsh_tests ;;
      "fish") run_fish_tests ;;
    esac
    
    # Update counters based on exit code
    if [ $? -eq 0 ]; then
      passed_tests=$((passed_tests + 1))
    else
      failed_tests=$((failed_tests + 1))
    fi
    total_tests=$((total_tests + 1))
  done
  
  # Run compatibility tests
  run_compatibility_tests
  if [ $? -eq 0 ]; then
    passed_tests=$((passed_tests + 1))
  else
    failed_tests=$((failed_tests + 1))
  fi
  total_tests=$((total_tests + 1))
  
  # Final results
  log_test "Test Results:"
  log_test "  Total: $total_tests"
  log_pass "  Passed: $passed_tests"
  if [ $failed_tests -gt 0 ]; then
    log_fail "  Failed: $failed_tests"
    exit 1
  else
    log_pass "All tests passed!"
    exit 0
  fi
}

main "$@"
```

## Migration Guide

### From ZSH v1 to Multi-Shell v3

```bash
# Migration script
#!/bin/sh
# migrate-v1-to-v3.sh

log_info "Migrating from AI Debug Context v1 (ZSH) to v3 (Multi-Shell)..."

# Backup existing configuration
if [ -f "$HOME/.ai-debug-context" ] || [ -d "$HOME/.ai-debug-context" ]; then
  log_info "Backing up existing configuration..."
  cp -r "$HOME/.ai-debug-context" "$HOME/.ai-debug-context.v1.backup"
fi

# Migrate configuration
migrate_config() {
  local old_config="$HOME/.ai-debug-context/.config"
  local new_config="$HOME/.ai-debug-context/config"
  
  if [ -f "$old_config" ]; then
    log_info "Migrating configuration from v1..."
    
    # Convert old format to new format
    while IFS='=' read -r key value; do
      case "$key" in
        "DEFAULT_PROJECT")
          echo "default_project=$value" >> "$new_config"
          ;;
        "OUTPUT_DIR")
          echo "output_directory=$value" >> "$new_config"
          ;;
        "AI_PROVIDER")
          echo "ai_provider=$value" >> "$new_config"
          ;;
      esac
    done < "$old_config"
    
    log_success "Configuration migrated"
  fi
}

# Update shell integration
update_shell_integration() {
  local shell_rc=""
  local old_source_line=""
  local new_source_line=""
  
  # Detect shell config file
  if [ -n "$ZSH_VERSION" ]; then
    shell_rc="$HOME/.zshrc"
    old_source_line="source.*ai_debug_context.zsh"
  elif [ -n "$BASH_VERSION" ]; then
    shell_rc="$HOME/.bashrc"
    old_source_line="source.*ai_debug_context.zsh"
  else
    log_warn "Shell not detected for migration"
    return 1
  fi
  
  new_source_line="source '$HOME/.ai-debug-context/common/ai-debug-core.sh'"
  
  if [ -f "$shell_rc" ] && grep -q "$old_source_line" "$shell_rc"; then
    log_info "Updating shell integration in $shell_rc"
    
    # Replace old source line with new one
    sed -i.bak "s|$old_source_line|$new_source_line|g" "$shell_rc"
    
    log_success "Shell integration updated"
  fi
}

# Main migration
main() {
  migrate_config
  update_shell_integration
  
  log_success "Migration completed!"
  log_info "Please restart your shell to activate the new version"
  log_info "Your v1 configuration has been backed up to ~/.ai-debug-context.v1.backup"
}

main "$@"
```

This comprehensive specification provides everything needed to implement the multi-shell version of AI Debug Context v3, supporting Bash, Zsh, and Fish with consistent functionality and shell-specific optimizations.