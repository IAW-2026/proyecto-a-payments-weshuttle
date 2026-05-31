---
description: Automatiza el merge de la feature actual a develop de forma concisa y robusta.
---
INSTRUCCIÓN CRÍTICA DE TOKENS: Sé ultra-conciso. No expliques los comandos de Git, no saludes, no des introducciones ni justifiques tus decisiones en el chat. Ejecuta las acciones directamente usando la herramienta bash y muestra al final un único y breve reporte de éxito. Si el servidor de GitHub devuelve mensajes informativos largos (como sugerencias de PR), ignóralos y continúa el flujo de inmediato.

Actúa como un script automatizado de Git Flow para la Payments App:

1. Detecta el nombre de la rama actual. Si no empieza con `feature/`, aborta inmediatamente con un error corto.
2. Extrae el número de Issue del nombre de la rama (ej. `feature/2-add-project-docs` -> Issue 2). Si no contiene un número, pregunta brevemente en el chat: "¿Número de Issue? (o 'ninguno')". Espera la respuesta.
3. Asegura que el entorno de trabajo esté limpio (`git status`).
4. Cambia a develop y trae lo último: `git checkout develop && git pull origin develop`
5. Fusiona la feature forzando merge commit (`--no-ff`). 
`git merge --no-ff <nombre-de-la-feature> -m ".."` 
Mensaje de commit:
   - Si hay issue asociado: `"Merge branch '<nombre-rama>' into develop. Closes #<número>"`
   - Si no hay issue: `"Merge branch '<nombre-rama>' into develop"`
6. Sube la rama develop actualizada al repositorio remoto: `git push origin develop`
7. Elimina la rama feature localmente: `git branch -d <nombre-rama>`
8. COMPROBACIÓN ROBUSTA: Verifica si la rama feature existía en el servidor remoto antes de intentar borrarla (ej. ejecutando silenciosamente `git ls-remote --heads origin <nombre-rama>`). 
   - Si devuelve un resultado (la rama existía en GitHub): elimínala usando `git push origin --delete <nombre-rama>`.
   - Si no devuelve nada (nunca se le hizo push): salta este paso y continúa.
9. Reporte final único: "✅ Rama <nombre-rama> integrada en develop. [Issue #XX cerrado]. Entorno limpio."