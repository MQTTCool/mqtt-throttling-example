/*
  MQTT.Cool - https://mqtt.cool

  MQTT Throttling Demo 

  Copyright (c) Lightstreamer Srl

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
"use strict";
$(function () {
  var loggerProvider = new mqttcool.SimpleLoggerProvider();
  loggerProvider.addLoggerAppender(new mqttcool.ConsoleAppender('INFO', 'mqtt.cool.subscriptions'));
  /*  loggerProvider.addLoggerAppender(
      new ConsoleAppender('DEBUG', 'mqtt.cool.test'));
    loggerProvider.addLoggerAppender(
      new ConsoleAppender('DEBUG', 'mqtt.cool.store'));*/

  //loggerProvider.addLoggerAppender(new mqttcool.ConsoleAppender('DEBUG', '*'));

  mqttcool.LoggerManager.setLoggerProvider(loggerProvider);
  const MQTTCOOL_HOST = 'http://localhost:8080';
  const BROKER_URL = 'tcp://broker.mqtt.cool:1883';

  // Max values for sliders.
  const MAX_FREQ_VALUE = 4.1;
  const MAX_BANDWIDTH_VALUE = 5.1;

  // Global chart options
  const TIME_WINDOW = 10; // seconds
  const MAX_SAMPLES = 100;
  const CHART_REFRESH_INTERVAL = 50; // milliseconds

  // Wraps a subscription to a specific IoT simulated Sensor and manipulates
  // chart displaying.
  const Sensor = function (sensorId, chartId) {
    this.sensorId = sensorId;
    this.chartId = chartId;
    this.topic = '/gambit/' + this.sensorId + '/telemetry';
    this.title = 'Sensor ' + sensorId;
    this.maxDistance = 0;
    this.subCounter = 0;

    this.raw = {
      counter: 0,
      chartColor: 'yellow',

      chartOptions: {
        data: [],
        label: 'Raw',
        lines: {
          show: true,
          fill: true,
          fillOpacity: 0.5,
          fillColor: 'yellow',
          lineWidth: 1
        },
        points: {
          show: false,
          fillOpacity: 0.5,
          fillColor: 'yellow'
        }
      },
      values: []
    };

    this.throttled = {
      counter: 0,
      chartColor: 'red',
      chartOptions: {
        data: [],
        label: 'Throttled',
        points: {
          show: true,
          fillOpacity: 0.5,
          fillColor: 'red'
        }
      },
      values: []
    }

    var self = this;
    this.update = function (type, payload, maxSamples) {
      // Update data for the charts.
      const values = self[type].values;
      const realTimeDistance = Math.abs(payload.distance);
      self.maxDistance = Math.max(realTimeDistance, self.maxDistance);

      const timestamp = payload.ts;
      var year = timestamp.substr(0, 4);
      var month = timestamp.substr(4, 2);
      var day = timestamp.substr(6, 2);
      var hour = timestamp.substr(9, 2);
      var minute = timestamp.substr(11, 2);
      var second = timestamp.substr(13, 2);
      var milliseconds = timestamp.substr(16, 3);
      var realTimeTimestamp = new Date(year + '-' + month + '-' + day + 'T' + hour
        + ':' + minute + ':' + second + '.' + milliseconds).getTime();

      values.push([realTimeTimestamp, realTimeDistance]);
      if (self[type].counter++ > maxSamples) {
        values.shift();
      }
      self[type].chartOptions.data = values;
    };

    function initFrequencySlider(maxFreqValue, onSlideEndCallback) {
      console.log('invoked initFrequencySlider');
      $('#' + self.chartId + '_frequencySelector').attr('value', maxFreqValue);
      updateFreqText(maxFreqValue);

      $('#' + self.chartId + '_frequencySelector').rangeslider({
        polyfill: false,
        onSlide: function (position, value) {
          value = updateFreqText(value);
        },
        onSlideEnd: function (position, value) {
          value = updateFreqText(value);

          // Prepare the basic subscriptions options.
          var subOptions = {
            onSuccess: function () {
              console.log('Subscribed');
            }
          };
          if (value !== 'Unlimited') {
            subOptions['maxFrequency'] = value;
          }
          onSlideEndCallback(subOptions);
        }
      });

      function updateFreqText(value) {
        if (value === maxFreqValue) {
          value = 'Unlimited';
        }
        $('#' + self.chartId + '_freqText').text(value + ' updates/second');
        return value;
      }
    };

    const frequencySelectorTemplate = '\
      <div id="' + self.chartId + '_freqContainer" class="freqSliderContainer sliders"> \
        <p class="rateDescription">Frequency Selector</p> \
        <input id="' + self.chartId + '_frequencySelector" type="range" min="0.1" max="' + MAX_FREQ_VALUE + '" step="0.1" data-orientation="horizontal"> \
        <p id="' + self.chartId + '_freqText" class="rateText"></p> \
      </div>';
    $('#' + self.chartId).after(frequencySelectorTemplate);

    const bandwidthSelectorTemplate = '\
      <div class="bandwidthSliderContainer sliders">\
        <p class="bandwidthDescription">Bandwidth selector</p>\
        <input id="' + self.chartId + '_bandwidthSelector" type="range" min="0.1" max="' + MAX_BANDWIDTH_VALUE + '" step="0.5" data-orientation="horizontal">\
        <p id="' + self.chartId + '_bandwidthText" class="rateText"></p>\
      </div>';

    var subcounter = 0;
    initFrequencySlider(MAX_FREQ_VALUE, function (subOptions) {
      // Subscribe again to the same topic, with updated options.
      console.log(subcounter++ + ') Subscribing at ' + JSON.stringify(subOptions));
      throttledClient.subscribe(self.topic, subOptions);

      /*console.log(subcounter++ + ') Subscribing at ' + JSON.stringify(subOptions));
      throttledClient.subscribe(self.topic, subOptions);*/

    });
  };

  // Array of IoT sensors pushing real-time data to the MQTT broker.
  const SENSORS = [
    new Sensor('20:19:AB:F4:0D:0D', 'sensor1'),
    new Sensor('20:19:AB:F4:0D:0E', 'sensor2'),
    new Sensor('20:19:AB:F4:0D:0F', 'sensor3'),
    new Sensor('20:19:AB:F4:0D:10', 'sensor4'),
    new Sensor('20:19:AB:F4:0D:11', 'sensor5'),
    new Sensor('20:19:AB:F4:0D:12', 'sensor6'),
    new Sensor('20:19:AB:F4:0D:13', 'sensor7'),
    new Sensor('20:19:AB:F4:0D:14', 'sensor8'),
    new Sensor('20:19:AB:F4:0D:15', 'sensor9'),
    new Sensor('20:19:AB:F4:0D:16', 'sensor10')
  ];

  // MqttClient instance with throttled updates
  var throttledClient;

  // MqttClient instance with raw updates
  var rawClient;

  // LightstreamerClient instance for bandwidth settings.
  var lightStreamerClient;

  function initBandwidthSlider(maxBandwidthValue, onSlideEnd) {
    $('#bandwidthSelector').attr('value', maxBandwidthValue);
    updateBandwidthText(maxBandwidthValue);

    $('#bandwidthSelector').rangeslider({
      polyfill: false,
      onSlide: function (position, value) {
        value = updateBandwidthText(value);
      },
      onSlideEnd: function (position, value) {
        value = updateBandwidthText(value);
        onSlideEnd(value);
      }
    });

    function updateBandwidthText(value) {
      if (value === maxBandwidthValue) {
        value = 'Unlimited';
      }
      $('#bandwidthText').text(value + ' kbps');
      console.log('Updating max bandwidth to ' + value);
      return value;
    }
  }

  initBandwidthSlider(MAX_BANDWIDTH_VALUE, function (value) {
    // Update the max bandwidth.
    lightStreamerClient.connectionOptions.setMaxBandwidth(value);
  });

  refreshCharts(SENSORS, TIME_WINDOW, CHART_REFRESH_INTERVAL);

  const MessageHandler = function (sensorType) {
    this.onMessageArrived =
      function (message) {
        try {
          const sensor = SENSORS.find(function (s) {
            return s.topic == message.destinationName;
          });
          const payload = JSON.parse(message.payloadString);
          sensor.update(sensorType, payload, MAX_SAMPLES);
        } catch (e) {
          console.log(e);
        }
      };
  }

  // Set up rawClient for reading distance detections.
  mqttcool.openSession(MQTTCOOL_HOST, 'demouser', '', {
    onConnectionSuccess: function (mqttCoolSession) {
      // Very simple attempt to avoid clientId collisions.
      const clientId = new Date().getTime().substring(16);
      
      rawClient = mqttCoolSession.createClient(BROKER_URL, clientId);

      // Set the message handler.
      var messageHandler = new MessageHandler('raw');
      rawClient.onMessageArrived = messageHandler.onMessageArrived;
      rawClient.onConnectionLost = function (res) {
        console.log('Connection Lost: ' + JSON.stringify(res));
      }

      rawClient.onReconnectionStart = function () {
        console.log('Starting reconnecting...');
      }

      rawClient.onReconnectionComplete = function () {
        console.log('Reconnection completed...');
      }

      rawClient.connect({
        onSuccess: function () {
          // Once connected, subscribe to the 'distance' topic and start charts.
          for (var i = 0; i < SENSORS.length; i++) {
            rawClient.subscribe(SENSORS[i].topic);
          }
        }
      });

    }
  });

  // Set up up throttledClient for reading distance detections and further
  // manipulation of frequency and bandwidth.
  mqttcool.openSession(MQTTCOOL_HOST, 'demouser', '', {
    onLsClient: function (lsClient) {
      // Cache reference to the LightstreamerClient object for further
      // manipulation on bandwidth.
      lightStreamerClient = lsClient;
    },

    onConnectionSuccess: function (mqttCoolSession) {
      throttledClient = mqttCoolSession.createClient(BROKER_URL);

      // Set the message handler.
      var messageHandler = new MessageHandler('throttled');
      throttledClient.onMessageArrived = messageHandler.onMessageArrived;

      throttledClient.connect({
        // Once connected, subscribe to the topic associated with the sensor.
        onSuccess: function () {
          for (var i = 0; i < SENSORS.length; i++) {
            throttledClient.subscribe(SENSORS[i].topic);
          }
        }
      });
    }
  });
});

function refreshCharts(sensors, timeWindow, refreshInterval) {
  const start = new Date().getTime() - 10 * 1000;
  return setInterval(function () {
    var currentDate = new Date();
    var tsMax = currentDate.getTime() + currentDate.getTimezoneOffset() * 60 * 1000;
    var tsMin = new Date(tsMax - timeWindow * 1000).getTime();
    for (var i = 0; i < sensors.length; i++) {
      drawCharts(sensors[i], 10000, start, tsMin, tsMax);
    }
  }, refreshInterval);
}

function drawCharts(sensor, maxDistance, start, tsMin, tsMax) {
  var container = document.getElementById(sensor.chartId);
  function xTicksFn(n) {
    return Math.round((n - sensor.startTimestamp) / 1000) + 's';
  }

  function yTicksFn(n) {
    return n + ' cm';
  }

  Flotr.draw(container,
    [
      sensor.raw.chartOptions,
      sensor.throttled.chartOptions
    ],
    {
      colors: [
        sensor.raw.chartColor,
        sensor.throttled.chartColor
      ],
      title: sensor.title,
      xaxis: {
        showLabels: true,
        mode: 'time',
        noTicks: 8,
        //tickFormatter: xTicksFn,
        min: tsMin,
        max: tsMax,
        title: 'Time',
        titleAlign: 'right'
      },
      yaxis: {
        title: 'Distance',
        max: 1.5 * sensor.maxDistance,
        min: 0,
        tickFormatter: yTicksFn,
        titleAngle: 90
      },
      mouse: {
        track: true,
      }
    });
}
