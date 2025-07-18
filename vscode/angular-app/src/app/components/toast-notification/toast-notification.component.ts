import { Component, ChangeDetectionStrategy, signal, computed, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastMessage, ToastAction } from '../../models';

// Toast service for global toast management
export interface ToastService {
  toasts(): ToastMessage[];
  showToast(toast: Omit<ToastMessage, 'id'>): void;
  dismissToast(id: string): void;
  clearAllToasts(): void;
}

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-container fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      @for (toast of visibleToasts(); track toast.id) {
        <div 
          class="toast-item transform transition-all duration-300 ease-in-out"
          [class]="getToastClasses(toast)"
          [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
          [attr.aria-live]="toast.type === 'error' ? 'assertive' : 'polite'"
          [attr.data-toast-id]="toast.id"
          [attr.data-toast-type]="toast.type"
          (mouseenter)="pauseTimer(toast.id)"
          (mouseleave)="resumeTimer(toast.id)">
          
          <div class="flex items-start gap-3 p-4">
            <!-- Icon -->
            <div class="flex-shrink-0 text-lg">
              {{ getToastIcon(toast.type) }}
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <h4 class="text-sm font-medium text-vscode-foreground truncate">
                  {{ toast.title }}
                </h4>
                <button
                  class="flex-shrink-0 text-vscode-foreground hover:text-vscode-error transition-colors ml-2"
                  (click)="dismissToast(toast.id)"
                  [attr.aria-label]="'Dismiss ' + toast.title"
                  title="Dismiss">
                  ✕
                </button>
              </div>
              
              <p class="text-sm text-vscode-foreground opacity-90 break-words">
                {{ toast.message }}
              </p>
              
              <!-- Actions -->
              @if (toast.actions && toast.actions.length > 0) {
                <div class="flex gap-2 mt-3">
                  @for (action of toast.actions; track action.label) {
                    <button
                      class="px-3 py-1 text-xs rounded transition-colors"
                      [class]="getActionButtonClass(toast.type)"
                      (click)="executeAction(action, toast.id)"
                      [attr.aria-label]="action.label">
                      {{ action.label }}
                    </button>
                  }
                </div>
              }
            </div>
          </div>
          
          <!-- Progress Bar -->
          @if (toast.duration && toast.duration > 0) {
            <div class="toast-progress h-1 bg-black bg-opacity-20 overflow-hidden">
              <div 
                class="h-full transition-all ease-linear"
                [class]="getProgressBarClass(toast.type)"
                [style.width.%]="getProgressPercentage(toast.id)"
                [style.transition-duration.ms]="100">
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      pointer-events: none;
    }
    
    .toast-item {
      pointer-events: auto;
      @apply bg-vscode-panel-background;
      @apply border border-vscode-panel-border;
      @apply rounded-lg shadow-lg;
      @apply min-w-0 max-w-full;
      @apply overflow-hidden;
    }
    
    .toast-item.info {
      @apply border-l-4 border-l-vscode-info;
      @apply bg-vscode-info bg-opacity-10;
    }
    
    .toast-item.success {
      @apply border-l-4 border-l-vscode-success;
      @apply bg-vscode-success bg-opacity-10;
    }
    
    .toast-item.warning {
      @apply border-l-4 border-l-vscode-warning;
      @apply bg-vscode-warning bg-opacity-10;
    }
    
    .toast-item.error {
      @apply border-l-4 border-l-vscode-error;
      @apply bg-vscode-error bg-opacity-10;
    }
    
    .toast-item.entering {
      @apply translate-x-full opacity-0;
    }
    
    .toast-item.entered {
      @apply translate-x-0 opacity-100;
    }
    
    .toast-item.exiting {
      @apply translate-x-full opacity-0;
    }
    
    .toast-progress {
      position: relative;
    }
    
    .toast-progress .bg-vscode-info {
      background-color: var(--vscode-terminal-ansiBlue);
    }
    
    .toast-progress .bg-vscode-success {
      background-color: var(--vscode-terminal-ansiGreen);
    }
    
    .toast-progress .bg-vscode-warning {
      background-color: var(--vscode-terminal-ansiYellow);
    }
    
    .toast-progress .bg-vscode-error {
      background-color: var(--vscode-terminal-ansiRed);
    }
    
    /* Animation classes */
    .toast-item {
      animation: slideIn 0.3s ease-out;
    }
    
    .toast-item.exiting {
      animation: slideOut 0.3s ease-in;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    /* Hover effects */
    .toast-item:hover {
      @apply shadow-xl;
      transform: translateY(-2px);
    }
    
    .toast-item:hover .toast-progress {
      opacity: 0.5;
    }
    
    /* Responsive design */
    @media (max-width: 640px) {
      .toast-container {
        @apply left-4 right-4 top-4;
        @apply max-w-none;
      }
      
      .toast-item {
        @apply max-w-none;
      }
    }
  `]
})
export class ToastNotificationComponent {
  // Inputs
  readonly toasts = input<ToastMessage[]>([]);
  readonly maxToasts = input<number>(5);
  readonly defaultDuration = input<number>(5000);
  readonly position = input<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  
  // Outputs
  readonly toastDismissed = output<string>();
  readonly actionExecuted = output<{ action: ToastAction; toastId: string }>();

  // Internal state
  private readonly timers = signal<Map<string, NodeJS.Timeout>>(new Map());
  private readonly pausedTimers = signal<Set<string>>(new Set());
  private readonly startTimes = signal<Map<string, number>>(new Map());
  private readonly animationStates = signal<Map<string, 'entering' | 'entered' | 'exiting'>>(new Map());

  // Computed properties
  readonly visibleToasts = computed(() => {
    return this.toasts().slice(0, this.maxToasts());
  });

  readonly containerClasses = computed(() => {
    const position = this.position();
    const baseClasses = 'toast-container fixed z-50 space-y-2 max-w-sm';
    
    switch (position) {
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  });

  constructor() {
    // Setup auto-dismiss timers when toasts change
    effect(() => {
      const toasts = this.toasts();
      const timers = this.timers();
      const startTimes = this.startTimes();
      
      // Clear old timers
      timers.forEach((timer, id) => {
        if (!toasts.find(t => t.id === id)) {
          clearTimeout(timer);
          timers.delete(id);
          startTimes.delete(id);
        }
      });
      
      // Setup new timers
      toasts.forEach(toast => {
        if (!timers.has(toast.id) && toast.duration) {
          const duration = toast.duration > 0 ? toast.duration : this.defaultDuration();
          startTimes.set(toast.id, Date.now());
          
          const timer = setTimeout(() => {
            this.dismissToast(toast.id);
          }, duration);
          
          timers.set(toast.id, timer);
        }
      });
      
      // Update signals
      this.timers.set(new Map(timers));
      this.startTimes.set(new Map(startTimes));
    });
  }

  // Toast management methods
  dismissToast(id: string): void {
    const animationStates = this.animationStates();
    animationStates.set(id, 'exiting');
    this.animationStates.set(new Map(animationStates));
    
    // Clear timer
    const timers = this.timers();
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
      this.timers.set(new Map(timers));
    }
    
    // Clear start time
    const startTimes = this.startTimes();
    startTimes.delete(id);
    this.startTimes.set(new Map(startTimes));
    
    // Emit dismiss event after animation
    setTimeout(() => {
      this.toastDismissed.emit(id);
    }, 300);
  }

  executeAction(action: ToastAction, toastId: string): void {
    action.action();
    this.actionExecuted.emit({ action, toastId });
    this.dismissToast(toastId);
  }

  pauseTimer(id: string): void {
    const pausedTimers = this.pausedTimers();
    pausedTimers.add(id);
    this.pausedTimers.set(new Set(pausedTimers));
    
    const timers = this.timers();
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
      this.timers.set(new Map(timers));
    }
  }

  resumeTimer(id: string): void {
    const pausedTimers = this.pausedTimers();
    pausedTimers.delete(id);
    this.pausedTimers.set(new Set(pausedTimers));
    
    const toast = this.toasts().find(t => t.id === id);
    if (!toast?.duration) return;
    
    const startTimes = this.startTimes();
    const startTime = startTimes.get(id);
    if (!startTime) return;
    
    const elapsed = Date.now() - startTime;
    const remaining = toast.duration - elapsed;
    
    if (remaining > 0) {
      const timer = setTimeout(() => {
        this.dismissToast(id);
      }, remaining);
      
      const timers = this.timers();
      timers.set(id, timer);
      this.timers.set(new Map(timers));
    }
  }

  // UI helper methods
  getToastClasses(toast: ToastMessage): string {
    const baseClasses = 'toast-item';
    const typeClass = toast.type;
    const animationStates = this.animationStates();
    const animationClass = animationStates.get(toast.id) || 'entered';
    
    return `${baseClasses} ${typeClass} ${animationClass}`;
  }

  getToastIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    };
    
    return iconMap[type] || 'ℹ️';
  }

  getActionButtonClass(toastType: string): string {
    const baseClasses = 'bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hover';
    
    switch (toastType) {
      case 'success':
        return `${baseClasses} border border-vscode-success`;
      case 'error':
        return `${baseClasses} border border-vscode-error`;
      case 'warning':
        return `${baseClasses} border border-vscode-warning`;
      case 'info':
        return `${baseClasses} border border-vscode-info`;
      default:
        return baseClasses;
    }
  }

  getProgressBarClass(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-vscode-success';
      case 'error':
        return 'bg-vscode-error';
      case 'warning':
        return 'bg-vscode-warning';
      case 'info':
        return 'bg-vscode-info';
      default:
        return 'bg-vscode-progress';
    }
  }

  getProgressPercentage(id: string): number {
    const toast = this.toasts().find(t => t.id === id);
    if (!toast?.duration) return 0;
    
    const startTimes = this.startTimes();
    const startTime = startTimes.get(id);
    if (!startTime) return 0;
    
    const elapsed = Date.now() - startTime;
    const percentage = Math.max(0, 100 - (elapsed / toast.duration) * 100);
    
    return percentage;
  }
}

// Toast Service Implementation
export class ToastNotificationService implements ToastService {
  private readonly _toasts = signal<ToastMessage[]>([]);
  private idCounter = 0;

  readonly toasts = this._toasts.asReadonly();

  showToast(toast: Omit<ToastMessage, 'id'>): void {
    const newToast: ToastMessage = {
      ...toast,
      id: `toast-${++this.idCounter}`,
      duration: toast.duration ?? 5000
    };
    
    this._toasts.update(toasts => [...toasts, newToast]);
  }

  dismissToast(id: string): void {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  clearAllToasts(): void {
    this._toasts.set([]);
  }

  // Convenience methods
  showSuccess(title: string, message: string, actions?: ToastAction[]): void {
    this.showToast({
      type: 'success',
      title,
      message,
      actions,
      duration: 3000
    });
  }

  showError(title: string, message: string, actions?: ToastAction[]): void {
    this.showToast({
      type: 'error',
      title,
      message,
      actions,
      duration: 0 // Don't auto-dismiss errors
    });
  }

  showWarning(title: string, message: string, actions?: ToastAction[]): void {
    this.showToast({
      type: 'warning',
      title,
      message,
      actions,
      duration: 5000
    });
  }

  showInfo(title: string, message: string, actions?: ToastAction[]): void {
    this.showToast({
      type: 'info',
      title,
      message,
      actions,
      duration: 4000
    });
  }
}
