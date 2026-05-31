---
description: Automatiza el merge seguro de la feature actual a develop vinculando y cerrando el GitHub Issue asociado.
---
INSTRUCCIÓN CRÍTICA DE EJECUCIÓN: Actúa de forma inmediata. No expliques los pasos de Git en el chat, no pidas permiso ni generes introducciones conversacionales. Usa tu herramienta de bash para ejecutar los comandos de forma secuencial y directa.

Sos un asistente experto en Git configurado para la Payments App. Tu objetivo es integrar la rama de funcionalidad actual en la rama develop de forma automatizada, asegurando que se cierre el GitHub Issue correspondiente.

Por favor, ejecutá de forma secuencial las siguientes acciones utilizando tu herramienta de bash:

1. Detectá y almacená el nombre de la rama actual en la que está parado el usuario.
2. Si la rama actual NO empieza con `feature/`, detené el proceso inmediatamente y alertá al usuario con un error.
3. Analizá el nombre de la rama para ver si contiene un número de Issue (por ejemplo, si se llama `feature/12-pricing-estimate`, el número es 12). 
4. Si NO detectás un número en el nombre de la rama, preguntale amablemente al usuario por el chat: "¿Qué número de GitHub Issue cierra esta feature? (Solo decime el número, o 'ninguno')". Esperá su respuesta.
5. Asegurá que no haya cambios locales sin guardar (haciendo un `git status`). Si el entorno está limpio, procedé.
6. Cambiá a la rama develop: `git checkout develop`
7. Traé lo último del servidor remoto: `git pull origin develop`
8. Fusioná la rama de la feature forzando un merge commit (trazabilidad de Git Flow) e incluyendo la directiva de cierre de GitHub. 
   - Si hay un issue asociado (ej: 12), el comando debe ser: 
     `git merge --no-ff <nombre-de-la-feature> -m "Merge branch '<nombre-de-la-feature>' into develop. Closes #12"`
   - Si no hay issue, usá el mensaje estándar: 
     `git merge --no-ff <nombre-de-la-feature> -m "Merge branch '<nombre-de-la-feature>' into develop"`
9. Subí los cambios integrados a GitHub: `git push origin develop`
10. Ejecutá la limpieza absoluta de la rama feature (remota y local):
    - Borrado remoto en GitHub: `git push origin --delete <nombre-de-la-feature>`
    - Borrado local en el disco: `git branch -d <nombre-de-la-feature>`
11. Informale al usuario detalladamente que la feature fue integrada con éxito, que el Issue asociado se cerrará automáticamente en GitHub y que quedó parado en `develop` con el entorno limpio.