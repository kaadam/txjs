// Copyright (c) 2017 Akos Kiss.
//
// Licensed under the BSD 3-Clause License
// <LICENSE.md or https://opensource.org/licenses/BSD-3-Clause>.
// This file may not be copied, modified, or distributed except
// according to those terms.

function UART(device, txCharacteristic, rxCharacteristic) {
    this.device = device;
    this.txCharacteristic = txCharacteristic;
    this.rxCharacteristic = rxCharacteristic;
}

UART.SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
UART.TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
UART.RX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// Promise<UART> connect(BluetoothDevice device, EventHandler onReceived, optional Log log);
UART.discovery = function(device) {
    return device.gatt.getPrimaryServices().then(services => {
    log('Getting Characteristics...');
    let queue = Promise.resolve();
    services.forEach(service => {
      queue = queue.then(_ => service.getCharacteristics().then(characteristics => {
        log('> Service: ' + service.uuid);
        characteristics.forEach(characteristic => {
          log('>> Characteristic: ' + characteristic.uuid + ' ' +
              getSupportedProperties(characteristic));
        });
      }));
    });
    return queue;
  })
}

UART.connect = function(device, onReceived, log={ println: _ => {} }) {
    var rxCharacteristic = null;
    var txCharacteristic = null;

    log.println('Getting UART service...');
    return device.gatt.getPrimaryService(UART.SERVICE_UUID)
        .then(service => {
            log.println('Getting UART characteristics...');
            return Promise.all([
                service.getCharacteristic(UART.RX_CHAR_UUID)
                    .then(characteristic => {
                        rxCharacteristic = characteristic;
                        log.println('UART RX characteristic obtained');

                        function onDisconnected(event) {
                            device.removeEventListener('gattserverdisconnected', onDisconnected);
                            rxCharacteristic.removeEventListener('characteristicvaluechanged', onReceived);
                            log.println('UART event handlers removed');
                        };
                        device.addEventListener('gattserverdisconnected', onDisconnected);
                        rxCharacteristic.addEventListener('characteristicvaluechanged', onReceived);
                        return rxCharacteristic.startNotifications();
                    })
                    .then(_ => {
                        log.println('UART RX notifications started');
                    }),
                service.getCharacteristic(UART.TX_CHAR_UUID)
                    .then(characteristic => {
                        txCharacteristic = characteristic;
                        log.println('UART TX characteristic obtained');
                    }),
            ]);
        })
        .then(_ => {
            return new UART(device, txCharacteristic, rxCharacteristic);
        });
}
