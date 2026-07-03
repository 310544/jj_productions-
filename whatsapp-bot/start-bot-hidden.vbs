' ============================================================
' Lanza el bot de recordatorios SIN ventana visible.
' Así nadie lo puede cerrar por error (corre en segundo plano).
' Pon un ACCESO DIRECTO a este archivo en la carpeta shell:startup
' para que arranque solo al prender el computador.
' ============================================================
Set fso   = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
' Trabaja dentro de la carpeta del bot (donde está este .vbs)
shell.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
' 0 = ventana oculta ; False = no esperar
shell.Run "cmd /c node index.mjs", 0, False
