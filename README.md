# MQTT.Cool - MQTT Throttling Demo - HTML Client

The **MQTT Throttling Demo** is a simple real-time telemetry application based
on MQTT.Cool and [MIMIC MQTT Simulator](https://www.gambitcomm.com/site/mqttsimulator.php).

## Live Demo

[![Live Demo](screen-large.png)](https://demos.mqtt.cool/mqtt-throttling/index.html)


## Details

The **MQTT Throttling Demo** is a demonstration of MQTT Cool data throttling 
using simulated sensors by [MIMIC MQTT Simulator](https://www.gambitcomm.com/site/mqttsimulator.php).

## Install

If you want to install a version of this demo pointing to your local MQTT.Cool,
follows these steps.

* Download MQTT.Cool from the mqtt.cool web site
[download page](https://mqtt.cool/download/latest-server) and unpack it (see
the [Quick Start](https://docs.mqtt.cool/server/guides/MQTT.Cool+Getting+Started+Guide.html#_quick_start) section of *Getting Started Guide* for more details).
* Launch the MQTT.Cool server.
* Download this project.
* As the latest version of the MQTT.Cool JavaScript library is always available
through [`unpkg`](https://unpkg.com/#/), it is hot-linked in the html page.
* Deploy this demo on MQTT.Cool (used as Web server) or in any external Web
server. If you choose the former, create a folder with name such as
`mqtt-throttling` under the `<MQTT.COOL_HOME>/pages` folder, and copy there the
contents of `src/web` of this project.

## Configure

The demo assumes that the MQTT.Cool server is launched from localhost, but if
you need to target a different server, search in `src/web/js/app.js` this
line:

```js
const MQTT_COOL_URL = 'http://localhost:8080';
```

and change it accordingly.

## Launch

Open your browser and point it to
[http://localhost:8080/mqtt-throttling](http://localhost:8080/mqtt-throttling),
or to the address according to the host and/or the name of the folder where you
deployed the project.

Immediately, the gauges in the web page reflect updates according to the
received real-time metrics.

## See Also

* [Check out all other demos on MQTT.Cool site](https://mqtt.cool/demos)

## MQTT.Cool Compatibility Notes

* Compatible with MQTT.Cool SDK for Web Clients version 1.2.1 or newer.
* Compatible with MQTT.Cool since version 1.2.0 or newer.
