# Date Picker Focus Fix - Targeted Approach

## Issue
The DatePicker was closing prematurely when users navigated through months/years, but the previous comprehensive fix was too aggressive and prevented normal calendar interactions.

## Targeted Solution
Instead of complex DOM monitoring, this fix uses a simple approach that specifically detects when focus is moving to calendar navigation elements.

## Implementation

### Key Change
Modified the `onBlur` handler in the DatePicker to check if the focus target is a calendar navigation element:

```typescript
onBlur: (event: React.FocusEvent) => {
    // Check if the focus is moving to a calendar-related element
    const relatedTarget = event.relatedTarget as HTMLElement;
    const isCalendarNavigation = relatedTarget && (
        relatedTarget.closest('.ms-DatePicker-monthAndYear') ||
        relatedTarget.closest('.ms-DatePicker-yearPicker') ||
        relatedTarget.closest('.ms-DatePicker-monthPicker') ||
        relatedTarget.closest('[role="grid"]') ||
        relatedTarget.classList.contains('ms-Button') ||
        relatedTarget.closest('.ms-DatePicker-wrap')
    );
    
    if (isCalendarNavigation) {
        // Focus is moving within the calendar, don't close yet
        return;
    }
    
    // Focus is leaving the calendar entirely, safe to close
    setTimeout(() => {
        setIsDatePickerActive(false);
        handleBlur();
    }, 50);
}
```

### How It Works
1. **On Focus Change**: When the DatePicker loses focus, check where focus is going
2. **Calendar Detection**: If focus moves to known calendar navigation elements, do nothing
3. **Normal Blur**: If focus leaves the calendar entirely, close after a short delay (50ms)
4. **Minimal Impact**: Only affects the DatePicker onBlur behavior, no other changes

### Benefits
- ✅ **Targeted**: Only prevents blur when navigating within calendar
- ✅ **Simple**: No complex DOM monitoring or state management
- ✅ **Fast**: 50ms delay instead of 200ms for better responsiveness
- ✅ **Reliable**: Uses FluentUI's actual CSS classes for detection
- ✅ **Non-invasive**: Doesn't affect other editor types or functionality

### Testing
The fix should now allow:
- Month/year navigation without closing the calendar
- Normal date selection that closes immediately
- Escape key cancellation
- Outside clicks that properly close the calendar
- All other DatePicker interactions work normally

The approach is much more conservative and only intercepts the specific case of calendar navigation blur events.