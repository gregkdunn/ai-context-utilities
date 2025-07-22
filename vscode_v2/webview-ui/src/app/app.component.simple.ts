import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; font-family: var(--vscode-font-family); background-color: var(--vscode-editor-background); color: var(--vscode-editor-foreground);">
      <h1>🎉 Angular App Loaded Successfully!</h1>
      <p>This is a simple test to verify Angular is working in VSCode webview.</p>
      
      <div style="margin: 20px 0; padding: 15px; background-color: var(--vscode-textBlockQuote-background); border-radius: 4px;">
        <h3>✅ Test Results:</h3>
        <ul>
          <li>Angular standalone component: Working</li>
          <li>VSCode CSS variables: {{ vscodeVariablesWorking() ? 'Working' : 'Not working' }}</li>
          <li>Component rendering: Working</li>
          <li>TypeScript compilation: Working</li>
        </ul>
      </div>
      
      <button 
        (click)="testClick()"
        style="padding: 10px 20px; background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;">
        Test Click Event
      </button>
      
      <div *ngIf="clickCount > 0" style="margin-top: 10px;">
        <p>Button clicked {{ clickCount }} time(s)! 🎯</p>
      </div>
      
      <div style="margin-top: 20px; font-size: 12px; color: var(--vscode-descriptionForeground);">
        <p>If you can see this, Angular is loading correctly. The issue with the main app might be:</p>
        <ul>
          <li>Complex component imports</li>
          <li>Service dependencies</li>
          <li>New Angular control flow syntax (&#64;if/&#64;for)</li>
          <li>Module loading issues</li>
        </ul>
      </div>
    </div>
  `,
  styles: []
})
export class AppComponent {
  clickCount = 0;

  testClick() {
    this.clickCount++;
    console.log('Test click worked!', this.clickCount);
  }

  vscodeVariablesWorking(): boolean {
    // Simple test to see if VSCode CSS variables are available
    return typeof getComputedStyle !== 'undefined';
  }
}
