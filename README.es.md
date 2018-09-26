# Flipper [![Estado de compilación](https://travis-ci.org/facebook/flipper.svg?branch=master)](https://travis-ci.org/facebook/flipper)

---

**Flipper, anteriormente Sonar, actualmente se encuentra en proceso de cambio de nombre. Esto puede causar algunas inconsistencias hasta que todo esté en su lugar. Nos disculpamos por cualquier inconveniencia causada.**

---

Flipper es una plataforma para depurar aplicaciones móviles en iOS y Android. Visualice, inspeccione y controle sus aplicaciones desde una simple interfaz de escritorio. Use Flipper como está o extiéndalo usando la API de complemento.

![Flipper](/website/static/img/splash@2x.png)

*Lea esto en otros idiomas: [Inglés](README.md)*

## Tabla de contenido

- [Desarrollo móvil](#desarrollo-móvil)
- [Alargamiento extensible](#extendiendo-flipper)
- [Contribuyendo a Flipper](#contribuyendo-a-flipper)
- [En este repositorio](#en-este-repositorio)
- [Primeros pasos](#primeros-pasos)
    - [Requisitos](#requisitos)
- [Construyendo desde Fuente](#construyendo-desde-fuente)
    - [Escritorio](#escritorio)
        - [Ejecutando desde la fuente](#ejecutando-desde-la-fuente)
        - [Creación de aplicaciones independientes](#creación-de-aplicaciones-independientes)
    - [iOS SDK + Aplicación de muestra](#ios-sdk--aplicación-de-muestra)
    - [Android SDK + aplicación de muestra](#android-sdk--aplicación-de-muestra)
    - [Documentación](#documentación)
    - [Contribuir](#contribuyendo)
    - [Licencia](#licencia)


## Desarrollo móvil

Flipper pretende ser su acompañante número uno para el desarrollo de aplicaciones móviles en iOS y Android. Por lo tanto, ofrecemos un conjunto de herramientas útiles que incluyen un visor de registro, un inspector de diseño interactivo y un inspector de red.

## Extendiendo Flipper

Flipper está construido como una plataforma. Además de utilizar las herramientas ya incluidas, puedes crear tus propios complementos para visualizar y depurar datos de tus aplicaciones móviles. Flipper se encarga de enviar y recibir datos, llamar funciones y escuchar eventos en la aplicación móvil.

## Contribuyendo a Flipper

Tanto la aplicación de escritorio de Flipper como los SDK móviles nativos son de código abierto y tienen licencia de MIT. Esto le permite ver y comprender cómo estamos creando complementos y, por supuesto, unirnos a la comunidad y ayudar a mejorar Flipper. Estamos emocionados de ver lo que construirás en esta plataforma.

# En este repositorio

Este repositorio incluye todas las partes de Flipper. Esto incluye:

* Aplicación de escritorio de Flipper construida usando [Electron](https://electronjs.org) (`/src`)
* SDK nativos de Flipper para iOS (`/iOS`)
* SDK nativos de Flipper para Android (`/android`)
* Complementos:
  * Registros (`/src/device-plugins/logs`)
  * Inspector de diseño (`/src/plugins/layout`)
  * Inspector de red (`/src/plugins/network`)
* sitio web y documentación (`/website` / `/docs`)

# Empezando

Consulte nuestra [Guía de inicio] (https://fbflipper.com/docs/getting-started.html) para configurar Flipper.

## Requisitos

* macOS (mientras que Flipper también se puede construir usando otros sistemas, solo macOS es compatible oficialmente)
* nodo> = 8
* hilo> = 1.5
* Herramientas de desarrollador de iOS (para desarrollar complementos de iOS)
* Android SDK y adb

# Building from Source

## Escritorio
### Corriendo desde la fuente

```
git clone https://github.com/facebook/flipper.git
cd flipper
yarn
yarn start
```

NOTA: Si está en Windows, necesita usar Yarn 1.5.1 hasta que se resuelva [este problema] (https://github.com/yarnpkg/yarn/issues/6048).

### Creación de aplicaciones independientes

```
yarn build --mac --version $buildNumber
```

## iOS SDK + Aplicación de ejemplo

```
cd iOS/Sample
pod install
open Sample.xcworkspace
<Run app from xcode>
```

## Android SDK + Aplicación de ejemplo

Inicie un emulador de Android y ejecute lo siguiente en la raíz del proyecto:

```
./gradlew :sample:installDebug
```

## Documentación

Encuentre la documentación completa para este proyecto en [fbflipper.com](https://fbflipper.com/docs).

## Contribuyendo
Consulte el archivo [CONTRIBUTING](/CONTRIBUTING.es.md) para saber cómo ayudar.

## License
Flipper tiene licencia MIT, como se encuentra en el archivo [LICENCIA](/LICENSE).