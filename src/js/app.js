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
  // Define urls for MQTT.Cool and the external MQTT broker.
  const MQTT_COOL_URL = 'http://localhost:8080';
  const BROKER_URL = 'tcp://broker.mqtt.cool:1883';

  // Max values for sliders.
  const MAX_FREQ_VALUE = 4.1;
  const MAX_BANDWIDTH_VALUE = 38;

  // Global chart options
  const TIME_WINDOW = 10; // seconds
  const MAX_SAMPLES = 100;
  const CHART_REFRESH_INTERVAL = 50; // milliseconds

  // Sensor wrapper, which manges MQTT subscription to a specific IoT simulated 
  // sensor and manipulates chart displaying.
  function Sensor(sensorId, chartId) {
    this.sensorId = sensorId;
    this.chartId = chartId;
    this.topic = '/gambit/' + this.sensorId + '/telemetry';
    this.title = 'Sensor ' + sensorId;
    this.maxDistance = 0;
    this.subCounter = 0;

    this.raw = {
      counter: 0,
      chartColor: '#f57600',

      chartOptions: {
        data: [],
        label: 'Raw',
        lines: {
          show: true,
          fill: true,
          fillOpacity: 0.5,
          fillColor: '#f57600',
          lineWidth: 1
        },
        points: {
          show: false,
          fillOpacity: 0.5,
          fillColor: '#f57600'
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
      if (self[type].counter++ > MAX_SAMPLES) {
        values.shift();
      }
      self[type].chartOptions.data = values;
    };

    function initFrequencySelector(onSlideEndCallback) {
      $('#' + self.chartId + '_frequencySelector').attr('value', MAX_FREQ_VALUE);
      updateFreqText(MAX_FREQ_VALUE);

      $('#' + self.chartId + '_frequencySelector').rangeslider({
        polyfill: false,
        onSlide: function (position, value) {
          value = updateFreqText(value);
        },
        onSlideEnd: function (position, value) {
          value = updateFreqText(value);

          // Prepare the basic subscriptions options.
          const subOptions = {};
          if (value !== 'Unlimited') {
            subOptions['maxFrequency'] = value;
          }
          onSlideEndCallback(subOptions);
        }
      });

      function updateFreqText(value) {
        if (value === MAX_FREQ_VALUE) {
          value = 'Unlimited';
        }
        $('#' + self.chartId + '_freqText').text(value + ' updates/second');
        return value;
      }
    };

    // Prepare template to be applied to every frequency selector.
    const frequencySelectorTemplate = '\
      <div id="' + self.chartId + '_freqContainer" class="freqSliderContainer sliders"> \
        <p class="rateDescription">Frequency Selector</p> \
        <input id="' + self.chartId + '_frequencySelector" type="range" min="0.1" max="' + MAX_FREQ_VALUE + '" step="0.1" data-orientation="horizontal"> \
        <p id="' + self.chartId + '_freqText" class="rateText"></p> \
      </div>';
    $('#' + self.chartId).after(frequencySelectorTemplate);

    // Initialize the relative frequency slider and pass the callback function
    // to be invoked at every change.
    initFrequencySelector(function (subOptions) {
      // Subscribe again to the same topic with updated options.
      throttledClient.subscribe(self.topic, subOptions);
    });
  };

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

  // MqttClient instance for receiving throttled data
  var throttledClient;

  // MqttClient instance for receiving non-throttled data
  var rawClient;

  // LightstreamerClient instance for bandwidth settings.
  var lightstreamerClientRef;

  // Initialize the max bandwidth selector and pass the callback function to be
  // invoked at every change.
  initBandwidthSelector(function (value) {
    lightstreamerClientRef.connectionOptions.setMaxBandwidth(value);
  });

  // Start displaying data.
  refreshCharts(SENSORS, TIME_WINDOW, CHART_REFRESH_INTERVAL);

  // Setup message handler for processing MQTT messages received from 
  // subscription and dispatches them to the relative sensor wrapper.
  const MessageHandler = function (sensorType) {
    return function (message) {
      const sensor = SENSORS.find(function (s) {
        return s.topic == message.destinationName;
      });
      const payload = JSON.parse(message.payloadString);
      sensor.update(sensorType, payload);
    };
  }

  // Set up up throttledClient for receiving real-time telemetry data that can
  // be further manipulated in frequency and bandwidth.
  mqttcool.openSession(MQTT_COOL_URL, 'demouser', '', {
    onConnectionSuccess: function (mqttCoolSession) {
      throttledClient = mqttCoolSession.createClient(BROKER_URL);

      // Set the message handler.
      throttledClient.onMessageArrived = new MessageHandler('throttled');

      throttledClient.connect({
        // Once connected, subscribe to the topic relative to each sensor.
        onSuccess: function () {
          for (var i = 0; i < SENSORS.length; i++) {
            throttledClient.subscribe(SENSORS[i].topic);
          }
        }
      });
    },

    onConnectionFailure: function (errorType, errorCode, errMessage) {
      console.log(errMessage);
    },

    onLsClient: function (lightstreamerClient) {
      // Cache reference to the LightstreamerClient object for further
      // manipulation of bandwidth.
      lightstreamerClientRef = lightstreamerClient;
    },
  });

  // Set up rawClient for receiving non-throttled real-time telemetry data.
  mqttcool.openSession(MQTT_COOL_URL, 'demouser', '', {
    onConnectionSuccess: function (mqttCoolSession) {
      // Very simple attempt to avoid clientId collisions.
      const clientId = 'client-' + new Date().getTime().toString();

      rawClient = mqttCoolSession.createClient(BROKER_URL, clientId);

      // Set the message handler.
      rawClient.onMessageArrived = new MessageHandler('raw');

      rawClient.connect({
        onSuccess: function () {
          // Once connected, subscribe to the topic relative to each sensor.
          for (var i = 0; i < SENSORS.length; i++) {
            rawClient.subscribe(SENSORS[i].topic);
          }
        }
      });
    }
  });


  function initBandwidthSelector(onSlideEnd) {
    $('#bandwidthSelector').attr('value', MAX_BANDWIDTH_VALUE);
    updateBandwidthText(MAX_BANDWIDTH_VALUE);

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
      if (value === MAX_BANDWIDTH_VALUE) {
        value = 'Unlimited';
      }
      $('#bandwidthText').text(value + ' kbps');
      console.log('Updating max bandwidth to ' + value);
      return value;
    }
  }

  function refreshCharts(sensors, timeWindow, refreshInterval) {
    return setInterval(function () {
      var currentDate = new Date();
      var tsMax = currentDate.getTime() + currentDate.getTimezoneOffset() * 60 * 1000 - 3000;
      var tsMin = new Date(tsMax - timeWindow * 1000).getTime();
      for (var i = 0; i < sensors.length; i++) {
        drawCharts(sensors[i], 10000, tsMin, tsMax);
      }
    }, refreshInterval);
  }

  function drawCharts(sensor, maxDistance, tsMin, tsMax) {
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
});


