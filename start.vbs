Set WshShell = CreateObject("WScript.Shell")
Set objArgs = WScript.Arguments

If objArgs.Count = 0 Then
    ' קבלת המיקום של הסקריפט
    strAppPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
Else
    ' אם התקבל ארגומנט, השתמש בו
    strAppPath = objArgs(0)
End If

' פונקציה לבדיקה אם התהליך כבר רץ
Function IsProcessRunning(processName)
    Dim objWMIService, colProcesses, objProcess
    Set objWMIService = GetObject("winmgmts:\\.\root\CIMV2")
    Set colProcesses = objWMIService.ExecQuery("SELECT * FROM Win32_Process WHERE Name = '" & processName & "'")

    For Each objProcess In colProcesses
        IsProcessRunning = True
        Exit Function
    Next

    IsProcessRunning = False
End Function

On Error Resume Next

' הרצת myapp.exe (השרת) רק אם הוא לא רץ כרגע
If Not IsProcessRunning("myapp.exe") Then
    WshShell.Run "cmd.exe /k """ & strAppPath & "\myapp.exe""", 0, false
    If Err.Number <> 0 Then
        WScript.Echo "Error: Failed to start myapp.exe. " & Err.Description
        WScript.Quit 1
    End If
End If

On Error GoTo 0

' פתיחת דפדפן עם הכתובת
On Error Resume Next
WshShell.Run "cmd.exe /c start http://localhost:3001", 1, False
If Err.Number <> 0 Then
    WScript.Echo "Error: Failed to open browser. " & Err.Description
    WScript.Quit 1
End If
On Error GoTo 0

' פונקציה לבדיקה אם דפדפן פתוח עם localhost:3001
Function IsBrowserOpen()
    On Error Resume Next
    Dim objWMIService, colProcesses, objProcess
    Set objWMIService = GetObject("winmgmts:\\.\root\cimv2")
    If Err.Number <> 0 Then
        IsBrowserOpen = False
        Exit Function
    End If
    Set colProcesses = objWMIService.ExecQuery("Select * from Win32_Process Where Name = 'chrome.exe' OR Name = 'firefox.exe' OR Name = 'msedge.exe'")
    On Error GoTo 0

    For Each objProcess In colProcesses
        If InStr(LCase(objProcess.CommandLine), "http://localhost:3001") > 0 Then
            IsBrowserOpen = True
            Exit Function
        End If
    Next

    IsBrowserOpen = False
End Function

' לולאה לבדיקת מצב הדפדפן
Do While IsBrowserOpen()
    WScript.Sleep 1000 ' המתן שנייה לפני הבדיקה הבאה
Loop

' סגירת השרת אם נפתח מהסקריפט הזה
If Not IsProcessRunning("myapp.exe") Then
    On Error Resume Next
    oExec.Terminate
    On Error GoTo 0
End If
