# Troubleshooting

## Common Issues

### Extension Not Loading
**Symptoms:** Extension doesn't appear in activity bar or panel won't open

**Solutions:**
1. **Check VSCode version** - Requires VSCode 1.85.0 or newer
   ```bash
   code --version
   ```
2. **Verify workspace contains NX projects** - Extension only activates in NX workspaces
3. **Restart VSCode** - Sometimes a simple restart resolves activation issues
4. **Check extension installation** - Verify extension is installed and enabled
5. **Review error logs** - Open Developer Tools (Help > Toggle Developer Tools)

### Commands Not Working
**Symptoms:** Commands fail to execute or show errors

**Solutions:**
1. **Ensure NX CLI is installed globally**
   ```bash
   npm install -g @nrwl/cli
   # or
   npm install -g nx
   ```
2. **Check project selection** - Verify correct project is selected in dropdown
3. **Verify terminal permissions** - Ensure VSCode has terminal access
4. **Check workspace root** - Extension needs to be run from NX workspace root
5. **Review command output** - Check real-time output for specific error messages

### Performance Issues
**Symptoms:** Extension is slow or unresponsive

**Solutions:**
1. **Check for large output files** - Clear output directory if files are very large
2. **Clear command history** - Use "Clear History" button in analytics view
3. **Restart extension** - Reload window (Developer: Reload Window)
4. **Close analytics view** - Analytics dashboard can use memory if left open
5. **Check system resources** - Monitor CPU and memory usage

### Project Detection Issues
**Symptoms:** Projects don't appear in dropdown

**Solutions:**
1. **Verify NX workspace** - Ensure `nx.json` exists in workspace root
2. **Check project configuration** - Run `nx list` in terminal to verify projects
3. **Refresh project list** - Click refresh button or use `Ctrl+R`
4. **Check file permissions** - Ensure extension can read `nx.json` and project files
5. **Verify workspace structure** - Projects should be in standard NX structure

### Output File Issues
**Symptoms:** Files not being created or saved incorrectly

**Solutions:**
1. **Check output directory permissions** - Ensure directory is writable
2. **Verify output directory path** - Check `aiDebugUtilities.outputDirectory` setting
3. **Clear cache** - Sometimes file cache gets corrupted
4. **Check disk space** - Ensure sufficient disk space available
5. **Review file validation** - Check if `validateContent` setting is causing issues

## Error Messages

### "Failed to detect NX workspace"
**Cause:** Extension cannot find `nx.json` file
**Solution:** 
1. Ensure you're in the root of an NX workspace
2. Check that `nx.json` exists and is readable
3. Restart VSCode and try again

### "Command execution failed"
**Cause:** Underlying command (nx, git, eslint) failed
**Solution:**
1. Check command output for specific error details
2. Verify all required tools are installed
3. Run command manually in terminal to debug
4. Check project configuration and dependencies

### "Permission denied"
**Cause:** Insufficient permissions for file or directory operations
**Solution:**
1. Check file/directory permissions
2. Run VSCode with appropriate permissions
3. Verify output directory is writable
4. Check if files are locked by other processes

### "Network timeout"
**Cause:** Network operation (like package installation) timed out
**Solution:**
1. Check internet connection
2. Retry the operation
3. Increase timeout settings if available
4. Use VPN if network is restricted

## Performance Optimization

### Reduce Memory Usage
1. **Close unused panels** - Close analytics view when not needed
2. **Clear output regularly** - Use clear buttons to remove old output
3. **Limit output file size** - Large files can consume memory
4. **Restart periodically** - Reload window to clear memory leaks

### Improve Command Speed
1. **Use specific test targeting** - Target specific test files instead of full suite
2. **Disable unnecessary features** - Turn off auto-backup if not needed
3. **Use local tools** - Ensure NX, ESLint, Prettier are installed locally
4. **Optimize git operations** - Keep git repository clean and optimized

### Reduce Bundle Size
1. **Clear old output files** - Remove outdated files from output directory
2. **Limit command history** - Clear history periodically
3. **Optimize workspace** - Remove unused dependencies and files

## Debug Mode

### Enable Debug Logging
1. Open VSCode settings (`Ctrl+,`)
2. Search for "developer"
3. Enable "Developer: Log Level" to "Debug"
4. Restart VSCode
5. Check Output panel > "AI Debug Utilities" for detailed logs

### Collect Debug Information
When reporting issues, include:
1. **VSCode version** - `code --version`
2. **Extension version** - Check in Extensions panel
3. **Operating system** - Windows, macOS, Linux
4. **Node.js version** - `node --version`
5. **NX version** - `nx --version`
6. **Error logs** - From Output panel and Developer Tools
7. **Reproduction steps** - Exact steps to reproduce the issue

## Getting Help

### Self-Help Resources
1. **Check this troubleshooting guide** - Most issues are covered here
2. **Review usage guide** - [Usage Guide](USAGE.md) has detailed instructions
3. **Read implementation docs** - Check [implementation documentation](../implementation/)
4. **Search existing issues** - Check GitHub issues for similar problems

### Community Support
1. **GitHub Issues** - [Report bugs and request features](https://github.com/your-repo/issues)
2. **Discussion Forum** - [Join community discussions](https://github.com/your-repo/discussions)
3. **Stack Overflow** - Tag questions with `ai-debug-utilities`

### Bug Reports
When creating a bug report, include:

**Environment:**
- VSCode version
- Extension version
- Operating system
- Node.js version
- NX version

**Issue Description:**
- What you were trying to do
- What you expected to happen
- What actually happened
- Error messages (if any)

**Reproduction Steps:**
1. Step-by-step instructions
2. Sample code or project (if applicable)
3. Screenshots or recordings (if helpful)

**Logs:**
- Console output from Developer Tools
- Output from "AI Debug Utilities" channel
- Relevant error messages

### Feature Requests
For feature requests:
1. **Check existing requests** - Search GitHub issues first
2. **Describe the use case** - Explain why the feature would be useful
3. **Provide examples** - Show how the feature would work
4. **Consider alternatives** - Mention if you've tried other solutions

## Recovery Procedures

### Reset Extension State
If extension is completely broken:
1. **Disable and re-enable extension**
2. **Clear extension data** - Remove workspace state files
3. **Reset configuration** - Restore default settings
4. **Reload window** - Developer: Reload Window
5. **Reinstall extension** - As last resort

### Recover Lost Data
If output files are lost:
1. **Check backup directory** - If auto-backup was enabled
2. **Check git history** - Files might be in version control
3. **Check recycle bin** - Files might have been accidentally deleted
4. **Restore from backup** - Use system backup if available

### Clean Workspace
To start fresh:
1. **Clear output directory** - Remove all generated files
2. **Clear command history** - Use clear history button
3. **Reset project selection** - Deselect and reselect project
4. **Restart extension** - Reload VSCode window

This troubleshooting guide should help resolve most common issues. For problems not covered here, please create a GitHub issue with detailed information about your environment and the specific problem you're experiencing.
