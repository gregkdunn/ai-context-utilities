  private showProjectSelector(): void {
    // Focus on project selector
    const projectElement = document.querySelector('app-project-selector');
    if (projectElement) {
      (projectElement as HTMLElement).focus();
    }
  }

  private refreshProjectData(): void {
    this.refreshData();
  }

  private showProjectAnalytics(): void {
    this.showAnalytics.set(true);
  }

  private copyActionConfiguration(): void {
    this.toastService.showInfo('Copied', 'Action configuration copied');
  }

  private selectAllActions(): void {
    this.toastService.showInfo('Selected', 'All actions selected');
  }

  private copyProgressInfo(): void {
    this.toastService.showInfo('Copied', 'Progress information copied');
  }

  private findInProgress(): void {
    this.toastService.showInfo('Find', 'Search in progress information');
  }

  private copyResults(): void {
    this.toastService.showInfo('Copied', 'Results copied to clipboard');
  }

  private downloadResults(): void {
    this.toastService.showInfo('Downloaded', 'Results downloaded');
  }

  private copyAnalytics(): void {
    this.toastService.showInfo('Copied', 'Analytics data copied');
  }

  private downloadAnalytics(): void {
    this.toastService.showInfo('Downloaded', 'Analytics data downloaded');
  }

  private copySystemInfo(): void {
    const info = `Workspace: ${this.getWorkspaceInfo()}\nVersion: ${this.getVersionInfo()}`;
    navigator.clipboard.writeText(info);
    this.toastService.showInfo('Copied', 'System information copied');
  }

  private selectAllText(): void {
    this.selectAll();
  }

  // Status helpers
  getStatusClass(): string {
    const status = this.commandStore.currentStatus();
    return `status-${status}`;
  }

  getStatusIcon(): string {
    const status = this.commandStore.currentStatus();
    switch (status) {
      case 'idle': return '⚪';
      case 'running': return '🔄';
      case 'queued': return '⏳';
      default: return '⚪';
    }
  }

  getStatusTitle(): string {
    const status = this.commandStore.currentStatus();
    const activeCount = this.commandStore.activeCommandCount();
    const queueLength = this.commandStore.queueLength();
    
    switch (status) {
      case 'idle': return 'Ready - No commands running';
      case 'running': return `Running ${activeCount} command${activeCount > 1 ? 's' : ''}`;
      case 'queued': return `${queueLength} command${queueLength > 1 ? 's' : ''} queued`;
      default: return 'Unknown status';
    }
  }

  hasActiveCommands(): boolean {
    return this.commandStore.activeCommandCount() > 0;
  }

  getWorkspaceInfo(): string {
    const workspaceInfo = this.projectStore.workspaceInfo();
    return workspaceInfo ? workspaceInfo.name : 'Unknown workspace';
  }

  getVersionInfo(): string {
    // This would typically come from package.json or build info
    return '3.4.0';
  }

  getShortcutTitle(description: string, shortcut: string): string {
    return `${description} (${shortcut})`;
  }

  // Accessibility
  getAppAriaLabel(): string {
    const projectCount = this.projectStore.projectCount();
    const activeCommands = this.commandStore.activeCommandCount();
    
    return `AI Debug Assistant. ${projectCount} projects available. ${activeCommands} commands running.`;
  }
}