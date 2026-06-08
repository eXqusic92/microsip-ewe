"use strict";

const { phoneDigits } = require("./phone");

function createDemoCard(phone) {
  const digits = phoneDigits(phone);

  return {
    found: true,
    source: "demo",
    contact: {
      phone,
      phoneDigits: digits,
      primaryName: "Олена Коваль",
      relatedPassengers: ["Олена Коваль", "Марія Коваль", "Андрій Коваль"],
      emails: ["olena.koval@example.com"]
    },
    stats: {
      orders: 8,
      tickets: 11,
      paidTickets: 8,
      cancelledTickets: 2,
      returnedTickets: 1,
      firstOrderAt: "2023-08-14T09:20:00.000Z",
      lastOrderAt: "2026-05-29T13:42:00.000Z",
      totals: [
        { currency: "UAH", amount: 15840 },
        { currency: "PLN", amount: 490 }
      ]
    },
    upcomingTrip: {
      id: "demo-1",
      ticketNumber: "1410258",
      orderNumber: "1048812",
      routeCode: "LVI-WAW",
      status: "buyout",
      passenger: "Олена Коваль",
      departAt: "2026-06-08T17:20:00.000Z",
      arriveAt: "2026-06-09T12:15:00.000Z",
      from: {
        locality: "Львів",
        point: "Автовокзал Центральний"
      },
      to: {
        locality: "Варшава",
        point: "Dworzec Zachodni"
      },
      carrier: 'EAST WEST EUROLINES / ТзОВ "Гал-Всесвіт"',
      seat: "3:8",
      price: { amount: 1450, currency: "UAH" },
      saleDate: "2026-05-29T13:42:00.000Z",
      returnInfo: null
    },
    tickets: [
      {
        id: "demo-1",
        ticketNumber: "1410258",
        orderNumber: "1048812",
        routeCode: "LVI-WAW",
        status: "buyout",
        passenger: "Олена Коваль",
        departAt: "2026-06-08T17:20:00.000Z",
        arriveAt: "2026-06-09T12:15:00.000Z",
        from: { locality: "Львів", point: "Автовокзал Центральний" },
        to: { locality: "Варшава", point: "Dworzec Zachodni" },
        carrier: 'EAST WEST EUROLINES / ТзОВ "Гал-Всесвіт"',
        seat: "3:8",
        price: { amount: 1450, currency: "UAH" },
        saleDate: "2026-05-29T13:42:00.000Z",
        returnInfo: null
      },
      {
        id: "demo-2",
        ticketNumber: "1409821",
        orderNumber: "1048460",
        routeCode: "KRK-LVI",
        status: "buyout",
        passenger: "Марія Коваль",
        departAt: "2026-04-18T07:40:00.000Z",
        arriveAt: "2026-04-18T16:30:00.000Z",
        from: { locality: "Краків", point: "MDA" },
        to: { locality: "Львів", point: "Автовокзал Центральний" },
        carrier: 'EAST WEST EUROLINES / ТзОВ "Гал-Всесвіт"',
        seat: "1:5",
        price: { amount: 490, currency: "PLN" },
        saleDate: "2026-04-03T10:04:00.000Z",
        returnInfo: null
      },
      {
        id: "demo-3",
        ticketNumber: "1407612",
        orderNumber: "1046501",
        routeCode: "WAW-TER",
        status: "cancel",
        passenger: "Олена Коваль",
        departAt: "2026-02-22T15:00:00.000Z",
        arriveAt: "2026-02-23T09:20:00.000Z",
        from: { locality: "Варшава", point: "Dworzec Zachodni" },
        to: { locality: "Тернопіль", point: "Автовокзал" },
        carrier: 'EAST WEST EUROLINES / ТзОВ "Львівське АТП-14631"',
        seat: "4:4",
        price: { amount: 1360, currency: "UAH" },
        saleDate: null,
        returnInfo: null
      },
      {
        id: "demo-4",
        ticketNumber: "1405120",
        orderNumber: "1044217",
        routeCode: "BRE-LVI",
        status: "return",
        passenger: "Андрій Коваль",
        departAt: "2025-12-19T11:30:00.000Z",
        arriveAt: "2025-12-20T08:45:00.000Z",
        from: { locality: "Бремен", point: "Fernbusterminal" },
        to: { locality: "Львів", point: "Автовокзал" },
        carrier: 'EAST WEST EUROLINES / ТзОВ "Львівське АТП-14631"',
        seat: "2:6",
        price: { amount: 2800, currency: "UAH" },
        saleDate: "2025-11-28T08:18:00.000Z",
        returnInfo: {
          amount: 2240,
          currency: "UAH",
          type: "return",
          description: ""
        }
      },
      {
        id: "demo-5",
        ticketNumber: "1399408",
        orderNumber: "1039074",
        routeCode: "WAW-LVI",
        status: "buyout",
        passenger: "Олена Коваль",
        departAt: "2025-08-07T18:40:00.000Z",
        arriveAt: "2025-08-08T05:35:00.000Z",
        from: { locality: "Варшава", point: "Dworzec Zachodni" },
        to: { locality: "Львів", point: "Автовокзал" },
        carrier: 'EAST WEST EUROLINES / ТзОВ "Гал-Всесвіт"',
        seat: "4:9",
        price: { amount: 1200, currency: "UAH" },
        saleDate: "2025-07-20T12:10:00.000Z",
        returnInfo: null
      }
    ],
    calls: [
      {
        id: "demo-call-3",
        callId: "demo-call-3",
        generalCallId: "demo-call-3",
        startedAt: "2026-05-31T09:18:00.000Z",
        type: "incoming",
        typeLabel: "Вхідний",
        internalNumber: "101",
        internalAdditionalData: "",
        externalNumber: digits,
        waitSec: 8,
        billSec: 214,
        disposition: "ANSWER",
        dispositionLabel: "Успішний дзвінок",
        recordingStatus: "uploaded",
        recordingStatusLabel: "Запис завантажено",
        isNewCall: false,
        whoHungUp: "",
        customer: { id: "demo-customer", name: "Олена Коваль" },
        employee: { name: "Павло", email: "" },
        pbxNumber: { number: "0443339292", name: "Відділ продажу" },
        history: []
      },
      {
        id: "demo-call-2",
        callId: "demo-call-2",
        generalCallId: "demo-call-2",
        startedAt: "2026-05-24T15:42:00.000Z",
        type: "outgoing",
        typeLabel: "Вихідний",
        internalNumber: "102",
        internalAdditionalData: "",
        externalNumber: digits,
        waitSec: 0,
        billSec: 92,
        disposition: "ANSWER",
        dispositionLabel: "Успішний дзвінок",
        recordingStatus: "saved",
        recordingStatusLabel: "Запис збережено",
        isNewCall: false,
        whoHungUp: "",
        customer: { id: "demo-customer", name: "Олена Коваль" },
        employee: { name: "Оператор", email: "" },
        pbxNumber: { number: "0443339292", name: "Відділ продажу" },
        history: []
      },
      {
        id: "demo-call-1",
        callId: "demo-call-1",
        generalCallId: "demo-call-1",
        startedAt: "2026-05-20T12:05:00.000Z",
        type: "incoming",
        typeLabel: "Вхідний",
        internalNumber: "101",
        internalAdditionalData: "",
        externalNumber: digits,
        waitSec: 18,
        billSec: 0,
        disposition: "NOANSWER",
        dispositionLabel: "Без відповіді",
        recordingStatus: "notRecord",
        recordingStatusLabel: "Не записувався",
        isNewCall: false,
        whoHungUp: "",
        customer: { id: "demo-customer", name: "Олена Коваль" },
        employee: { name: "Павло", email: "" },
        pbxNumber: { number: "0443339292", name: "Відділ продажу" },
        history: []
      }
    ],
    notes: [
      {
        id: "demo-note-1",
        text: "Просить телефонувати у Viber, якщо змінюється час відправлення.",
        createdBy: "Оператор",
        createdAt: "2026-05-29T13:48:00.000Z",
        source: "demo"
      }
    ],
    warnings: []
  };
}

module.exports = {
  createDemoCard
};
