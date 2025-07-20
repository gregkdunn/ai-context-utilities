# VSCode Extension Testing Quick Reference

## 🚀 Quick Start Testing

### 1. Run Tests First
```bash
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2
chmod +x ../temp_scripts/full_test_vscode2.sh
../temp_scripts/full_test_vscode2.sh
```

### 2. Open in VSCode & Launch Extension
1. Open the `vscode_2` folder in VSCode
2. Press `F5` to launch Extension Development Host
3. Look for **AI Debug Context** icon in Activity Panel (🐛 debug icon)
4. Click the icon to open the webview

### 3. Test Each Module

#### File Selection Module (DIFF)
- ✅ Test "Uncommitted Changes" mode
- ✅ Test "Previous Commit" mode with multi-commit selection
- ✅ Test "Branch Diff" mode
- ✅ Verify selection summaries and validation

#### Test Selection Module (NX TEST)  
- ✅ Test "Affected Tests" mode
- ✅ Test "Project Tests" mode
- ✅ Verify command previews

#### AI Debug Module (AI TEST DEBUG)
- ✅ Test workflow orchestration
- ✅ Verify prerequisite validation
- ✅ Test with different file/test configurations

#### PR Generator Module (PR DESC)
- ✅ Test template selection
- ✅ Test Jira ticket input
- ✅ Test feature flag detection

## 🔍 What to Look For

### Expected Working Features:
- ✅ Extension loads without errors
- ✅ Activity Panel icon appears
- ✅ Webview opens with Angular UI
- ✅ All 4 modules are accessible
- ✅ Navigation between modules works
- ✅ Mock data displays correctly
- ✅ VSCode theme integration works

### Current Limitations (Expected):
- ⚠️ Git operations return mock data
- ⚠️ NX commands are simulated
- ⚠️ AI analysis shows placeholder responses
- ⚠️ PR generation uses templates only

## 📋 Test Checklist

### Basic Functionality:
- [ ] Extension activates without errors
- [ ] Activity Panel icon appears
- [ ] Webview opens successfully
- [ ] Angular UI loads completely
- [ ] All 4 modules are accessible

### File Selection:
- [ ] Uncommitted changes mode works
- [ ] Commit selection mode works
- [ ] Multi-commit selection works correctly
- [ ] Branch diff mode works
- [ ] Selection validation works

### Test Selection:
- [ ] Affected tests mode works
- [ ] Project selection works
- [ ] Command preview shows correctly

### AI Debug:
- [ ] Prerequisite validation works
- [ ] Workflow can be initiated
- [ ] Progress tracking works

### PR Generator:
- [ ] Template selection works
- [ ] Jira input validation works
- [ ] Mock generation works

## 🐛 If Something Doesn't Work

### Common Issues:
1. **Extension doesn't activate**: Check console for errors
2. **Webview doesn't load**: Check if Angular build exists in `out/webview/`
3. **TypeScript errors**: Run `npx tsc --noEmit` to check
4. **Module doesn't display**: Check browser dev tools in webview

### Debug Commands:
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Rebuild Angular UI
cd webview-ui && npm run build && cd ..

# Recompile extension
npm run compile

# Run tests
npm test
cd webview-ui && npm test && cd ..
```

## ✅ Success Criteria

The extension is working correctly if:
1. All tests in the test script pass
2. Extension loads in VSCode Development Host
3. All 4 modules are accessible and functional
4. Navigation works smoothly
5. Mock data displays as expected

Ready to proceed to real integrations! 🎉
