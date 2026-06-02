---
description: Automatiza el proceso formal de Git Flow para la entrega final del proyecto. Requiere la versión como argumento.
---
Sos un asistente experto en Git encargado de la entrega formal de la Payments App. El usuario ha iniciado este comando pasando la versión como argumento en la variable $1 (por ejemplo: 1.0.0).

Por favor, ejecutá de forma secuencial las siguientes acciones utilizando tu herramienta de bash:

1. Validá que el argumento de versión ($1) no esté vacío. Si lo está, pedile al usuario la versión antes de continuar.
2. Cambiá a la rama develop y traé lo último: `git checkout develop && git pull origin develop`
3. Creá la rama de release formal: `git checkout -b release/$1`
4. Subí la rama de release al repositorio remoto de GitHub (esencial para que exista al abrir el PR de entrega): `git push origin release/$1`
5. Cambiá a la rama main y actualizala: `git checkout main && git pull origin main`
6. Fusioná el release en main forzando un merge commit: `git merge --no-ff release/$1 -m "Release $1"`
7. Creá el tag o etiqueta inviolable de la versión en main: `git tag v$1 -m "Release version $1"`
8. Volvé a la rama develop para sincronizar los cambios de estabilización: `git checkout develop`
9. Fusioná la rama release de vuelta en develop: `git merge --no-ff release/$1 -m "Merge release $1 back to develop"`
10. Subí todos los cambios de main, develop y las etiquetas a GitHub: `git push origin main develop --tags`
11. Eliminá la rama de release local para mantener la limpieza del entorno: `git branch -d release/$1`
12. Imprimí un mensaje final claro en la terminal:
    "========================================================================"
    "✅ ¡Proceso de Git Flow completado con éxito por el agente!"
    "📍 Se ha creado y subido el tag v$1 a main."
    "📢 ACCIÓN REQUERIDA: Ve a GitHub y abre manualmente el Pull Request desde la rama 'release/$1' hacia la rama 'entrega'."
    "========================================================================"