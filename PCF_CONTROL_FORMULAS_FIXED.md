# Fixed Power Apps Formulas for PCF Control - v10.0.5

## 🚫 **IMPORTANT: PCF Controls Are NOT Resetable**

PCF controls cannot use `Reset(Self)` like standard Power Apps controls. Here are the correct approaches:

---

## ✅ **Method 1: Using CancelChangesTrigger Property (Recommended)**

**OnChange property of your PCF control:**
```powerapp
Switch(
    Self.EventName,
    "ButtonSaveEvent",
        ForAll(
            JSON(Self.EditedRecords, "[recordId,changes]"),
            Patch(
                YourDataSource,
                LookUp(YourDataSource, ID = Value(ThisRecord.recordId)),
                ThisRecord.changes
            )
        ),
    "ButtonCancelEvent",
        // Trigger the PCF control's cancel mechanism
        Set(CancelTrigger, Text(Now(), "yyyy-mm-dd hh:mm:ss.fff"));
        UpdateContext({CancelTrigger: Text(Now(), "yyyy-mm-dd hh:mm:ss.fff")})
)
```

**Set the CancelChangesTrigger property of your PCF control to:**
```powerapp
CancelTrigger
```

---

## ✅ **Method 2: Direct Method Call (If Available)**

Some PCF controls expose direct methods. Check if yours has a `clearAllPendingChanges` method:

**OnChange property:**
```powerapp
Switch(
    Self.EventName,
    "ButtonSaveEvent",
        ForAll(
            JSON(Self.EditedRecords, "[recordId,changes]"),
            Patch(
                YourDataSource,
                LookUp(YourDataSource, ID = Value(ThisRecord.recordId)),
                ThisRecord.changes
            )
        ),
    "ButtonCancelEvent",
        // Try direct method if available
        Set(ClearResult, MyGrid.clearAllPendingChanges());
        Notify("Changes cancelled", NotificationType.Information)
)
```

---

## ✅ **Method 3: Refresh Data Source (Nuclear Option)**

If other methods don't work, refresh the underlying data source:

**OnChange property:**
```powerapp
Switch(
    Self.EventName,
    "ButtonSaveEvent",
        ForAll(
            JSON(Self.EditedRecords, "[recordId,changes]"),
            Patch(
                YourDataSource,
                LookUp(YourDataSource, ID = Value(ThisRecord.recordId)),
                ThisRecord.changes
            )
        ),
    "ButtonCancelEvent",
        // Refresh the data source to clear pending changes
        Refresh(YourDataSource);
        Notify("Changes cancelled - data refreshed", NotificationType.Information)
)
```

---

## ✅ **Method 4: Set a Cancel Variable (Most Reliable)**

**Screen OnVisible:**
```powerapp
Set(CancelChangesVar, "");
```

**OnChange property of PCF control:**
```powerapp
Switch(
    Self.EventName,
    "ButtonSaveEvent",
        ForAll(
            JSON(Self.EditedRecords, "[recordId,changes]"),
            Patch(
                YourDataSource,
                LookUp(YourDataSource, ID = Value(ThisRecord.recordId)),
                ThisRecord.changes
            )
        ),
    "ButtonCancelEvent",
        // Set the cancel trigger variable
        Set(CancelChangesVar, Text(Now(), "yyyy-mm-dd hh:mm:ss.fff"));
        Notify("Changes cancelled", NotificationType.Information)
)
```

**CancelChangesTrigger property of PCF control:**
```powerapp
CancelChangesVar
```

---

## 🔧 **Complete Working Example**

**Variables to create in OnVisible:**
```powerapp
Set(CancelChangesVar, "");
Set(SaveInProgress, false);
```

**OnChange property:**
```powerapp
Switch(
    Self.EventName,
    "ButtonSaveEvent",
        // Save changes
        Set(SaveInProgress, true);
        IfError(
            Set(SaveResult, 
                ForAll(
                    JSON(Self.EditedRecords, "[recordId,changes]"),
                    Patch(
                        YourDataSource,
                        LookUp(YourDataSource, ID = Value(ThisRecord.recordId)),
                        ThisRecord.changes
                    )
                )
            );
            Set(SaveInProgress, false);
            Notify("Successfully saved " & Self.EditedRecordsCount & " changes", NotificationType.Success),
            // Error handling
            Set(SaveInProgress, false);
            Notify("Save failed: " & FirstError.Message, NotificationType.Error)
        ),
    "ButtonCancelEvent",
        // Cancel changes using trigger variable
        Set(CancelChangesVar, Text(Now(), "yyyy-mm-dd hh:mm:ss.fff"));
        Notify("Changes cancelled", NotificationType.Information)
)
```

**PCF Control Properties:**
- **CancelChangesTrigger**: `CancelChangesVar`
- **Records**: Your data source
- **Columns**: Your column configuration

---

## 🎯 **Why Reset() Doesn't Work**

PCF (PowerApps Component Framework) controls are:
- ✅ **Custom components** built with TypeScript/React
- ❌ **NOT standard Power Apps controls** (like TextInput, Gallery, etc.)
- ❌ **NOT resetable** using the `Reset()` function
- ✅ **Have their own internal state management**

The PCF control manages its own `pendingChanges` Map internally and provides input/output properties to communicate with Power Apps.

---

## 🧪 **Testing Your Implementation**

1. **Make some edits** in the grid
2. **Check** that `Self.EditedRecordsCount > 0`
3. **Click Cancel** - should trigger `ButtonCancelEvent`
4. **Verify** that `Self.EditedRecordsCount` returns to 0
5. **Check** that visual indicators are cleared

---

## 📊 **Recommended Approach**

**Use Method 4 (Cancel Variable)** as it's the most reliable and doesn't depend on data source refreshing:

```powerapp
// OnVisible
Set(CancelChangesVar, "");

// OnChange
Switch(
    Self.EventName,
    "ButtonCancelEvent",
    Set(CancelChangesVar, Text(Now(), "yyyy-mm-dd hh:mm:ss.fff"))
)

// PCF CancelChangesTrigger property
CancelChangesVar
```

This approach uses the PCF control's built-in cancel mechanism which properly clears the internal `pendingChanges` Map and updates all visual indicators.
