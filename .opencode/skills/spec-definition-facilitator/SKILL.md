---
name: spec-definition-facilitator
description: Historia de usuario, spec, asunciones, barra de progreso. Use ONLY when the user wants to completar una especificacion a partir de una historia de usuario y validar asunciones una por una.
---

# Spec Definition Facilitator

Usa este skill solo cuando el usuario quiera construir una especificacion a partir de una historia de usuario incompleta y validar asunciones conversacionalmente.

## Objetivo

Converti una historia de usuario en una spec preliminar con espacios faltantes resueltos por asunciones. Despues, mostrá las asunciones no tecnicas o no funcionales que hiciste para que el usuario pueda corregirlas una por una. Cuando se resuelvan todas, indicá que ya estas listo para crear la especificacion.

## Reglas

1. Si el usuario todavia no compartio la historia de usuario, pedisela.
2. Genera una version preliminar de la spec completando los espacios en blanco con supuestos razonables.
3. Separa y lista solo las asunciones no tecnicas o no funcionales.
4. Presenta esas asunciones como una lista numerada.
5. Pedi al usuario que responda con los numeros de las asunciones que no le gustan.
6. Por cada asuncion rechazada, hace exactamente una pregunta por turno.
7. Cada pregunta debe incluir una barra de progreso con cantidad actual y total.
8. En cada pregunta ofrece exactamente cinco opciones: cuatro alternativas concretas y una quinta opcion `Otra`.
9. Si el usuario elige `Otra`, pedile que escriba la definicion deseada y usala.
10. Despues de cada respuesta, actualiza la asuncion correspondiente y pasa a la siguiente pendiente.
11. Cuando no queden asunciones pendientes, responde: `Ya estoy listo para crear la especificacion.`

## Alcance de las asunciones a listar

Lista solo supuestos de negocio, comportamiento esperado, reglas operativas, prioridades, actores, restricciones funcionales visibles para el usuario o criterios de aceptacion implicitos.

No listes supuestos puramente tecnicos como framework, base de datos, arquitectura, nombres de clases, endpoints, librerias o detalles de infraestructura, salvo que el usuario los haya pedido explicitamente como parte de la spec.

## Flujo

### 1. Spec preliminar

Despues de recibir la historia de usuario:

- Redacta una spec preliminar breve y estructurada.
- Completa los huecos con supuestos explicitos.
- Luego agrega una seccion `Asunciones realizadas` con la lista numerada.
- Cierra con: `Indicame los numeros de las asunciones que queres cambiar.`

### 2. Preguntas de correccion

Cuando el usuario indique numeros:

- Crea una cola con esas asunciones.
- Hace una sola pregunta por vez.
- Numera el avance segun la posicion en la cola.

Formato obligatorio:

```md
Progreso: [##--] 2/4

Pregunta sobre la asuncion 3: <reformula la decision a validar>

1. <opcion concreta>
2. <opcion concreta>
3. <opcion concreta>
4. <opcion concreta>
5. Otra
```

La barra debe tener 4 caracteres internos. Ejemplos:

- `[#---] 1/4`
- `[##--] 2/4`
- `[###-] 3/4`
- `[####] 4/4`

### 3. Respuesta del usuario

Si responde `1`, `2`, `3` o `4`:

- Toma literalmente esa alternativa.
- Actualiza la asuncion.
- Si quedan pendientes, hace la siguiente pregunta.

Si responde `5` o `Otra`:

- Pedi una definicion libre para esa unica asuncion.
- No avances a la siguiente hasta recibirla.

Si responde texto libre directamente:

- Interpretalo como la nueva definicion de la asuncion actual.
- Actualiza y continua.

## Criterios de estilo

- Escribi en espanol.
- Se conciso y directo.
- No mezcles varias preguntas en un mismo turno.
- No rehagas toda la spec en cada pregunta intermedia.
- Solo al final, cuando ya no haya pendientes, indica que estas listo para crear la especificacion.

## Plantilla sugerida para la spec preliminar

```md
## Spec preliminar

### Historia de usuario
<historia original o resumida>

### Objetivo
<objetivo inferido>

### Alcance funcional
- <punto>
- <punto>

### Criterios de aceptacion iniciales
- <criterio>
- <criterio>

## Asunciones realizadas
1. <asuncion>
2. <asuncion>
3. <asuncion>

Indicame los numeros de las asunciones que queres cambiar.
```

## Cierre

Cuando termines de resolver todas las asunciones observadas por el usuario, responde exactamente:

`Ya estoy listo para crear la especificacion.`
