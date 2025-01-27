Set WshShell = CreateObject("WScript.Shell")
Set objArgs = WScript.Arguments

' אם לא התקבל ארגומנט, השתמש במיקום של הסקריפט עצמו
If objArgs.Count = 0 Then
    ' קבלת המיקום של הסקריפט
    strAppPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
Else
    ' אם התקבל ארגומנט, השתמש בו
    strAppPath = objArgs(0)
End If
On Error Resume Next

' הרצת myapp.exe (השרת) ברקע
WshShell.Run """" & strAppPath & "\myapp.exe""", 0, False
If Err.Number <> 0 Then
    WScript.Echo "Error: Failed to start myapp.exe. " & Err.Description
    WScript.Quit 1
End If

' פתיחת דפדפן עם הכתובת
WshShell.Run "cmd.exe /c start http://localhost:3001", 1, False
If Err.Number <> 0 Then
    WScript.Echo "Error: Failed to open browser. " & Err.Description
    oExec.Terminate
    WScript.Quit 1
End If

' בדיקת חלונות דפדפן
Function IsBrowserOpen()
    Dim objWMIService, colProcesses, objProcess
    Set objWMIService = GetObject("winmgmts:\\.\root\cimv2")
    Set colProcesses = objWMIService.ExecQuery("Select * from Win32_Process Where Name = 'chrome.exe' OR Name = 'firefox.exe' OR Name = 'msedge.exe'")

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

' סגירת השרת
oExec.Terminate
