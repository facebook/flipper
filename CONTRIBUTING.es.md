# Contribuyendo a Flipper

Queremos hacer que la contribución a este proyecto sea tan fácil y transparente como
posible.

*Lea esto en otros idiomas: [Inglés](CONTRIBUTING.md)*

## Nuestro proceso de desarrollo

Los cambios de los empleados de Facebook se sincronizan automáticamente con el repositorio de GitHub.
PRs de la comunidad se importan a nuestro control de fuente interno y luego
empujado a GitHub.

Para cambios que afectan tanto al código nativo como a JavaScript, asegúrese de crear solo
un solo PR que contiene ambas partes del código.

Aunque la aplicación de escritorio Flipper solo se lanzó para macOS en este momento, es
posible crear compilaciones de Windows y Linux de la aplicación. Por favor tenga esto en cuenta
cuando se trata de un código específico de la plataforma.

## Pull Requests

Aceptamos activamente sus solicitudes de extracción.

1. Tenedor el repositorio y crear su rama de `master`.
2. Si ha agregado un código que debe probarse, agregue pruebas.
3. Si ha cambiado las API, actualice la documentación.
4. Asegúrese de que el conjunto de pruebas pase.
5. Asegúrate de que tu código esté limpio.
6. Si aún no lo ha hecho, complete el Acuerdo de Licencia del Colaborador ("CLA").

## Acuerdo de licencia del colaborador ("CLA")

Para aceptar su solicitud de extracción, necesitamos que envíe un CLA. Solo necesitas
hacer esto una vez para trabajar en cualquiera de los proyectos de código abierto de Facebook.

Complete su CLA aquí: <https://code.facebook.com/cla>

## Cuestiones

Usamos problemas de GitHub para rastrear errores públicos. Por favor, asegúrese de que su descripción sea
claro y tiene instrucciones suficientes para poder reproducir el problema.

Facebook tiene un [programa de recompensas](https://www.facebook.com/whitehat/) para la caja fuerte
divulgación de errores de seguridad. En esos casos, pase por el proceso
se indica en esa página y no presenta un problema público.

## Estilo de codificación

Estamos usando Prettier para formatear nuestro código fuente. Los estilos se aplican a través de
eslint. Asegúrese de que todo esté bien formateado antes de crear un PR. Por lo tanto,
ejecutar `yarn lint` y `yarn fix` para aplicar correcciones de formato.

## License

Al contribuir con Flipper, usted acepta que sus contribuciones serán licenciadas
en el archivo [LICENCIA] (./ LICENCIA).