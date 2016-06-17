"use strict";

describe("Widgets view", () => {
  var f, uiConfig;

  beforeEach(module("homeuiApp.fakeTime"));
  beforeEach(module("homeuiApp.mqttViewFixture"));

  beforeEach(inject((MqttViewFixture, _uiConfig_, $rootScope, FakeTime) => {
    FakeTime.setTime(1466183742396);
    uiConfig = _uiConfig_;
    uiConfig.data.dashboards = [
      {
        id: "dashboard1",
        name: "Dashboard 1",
        widgets: ["widget1", "widget2"]
      },
      {
        id: "dashboard2",
        name: "Dashboard 2",
        widgets: ["widget2"]
      }
    ];
    uiConfig.data.widgets = [
      {
        id: "widget1",
        name: "Temperatures",
        description: "Some temperatures",
        compact: true,
        cells: [
          { id: "foo/temp1" },
          { id: "foo/temp2" }
        ]
      },
      {
        id: "widget2",
        name: "Switches",
        description: "Some switches",
        compact: true,
        cells: [
          { id: "foo/switch1" },
          { id: "foo/switch2" }
        ]
      }
    ];
    $rootScope.$digest();
    f = new MqttViewFixture("views/widgets.html", "WidgetsCtrl");
    f.extClient.send("/devices/foo/meta/name", "Foo", true, 1);
    f.extClient.send("/devices/foo/controls/temp1/meta/type", "temperature", true, 1);
    f.extClient.send("/devices/foo/controls/temp1/meta/name", "Temp 1", true, 1);
    f.extClient.send("/devices/foo/controls/temp1", "42", true, 0);
    f.extClient.send("/devices/foo/controls/temp2/meta/type", "temperature", true, 1);
    f.extClient.send("/devices/foo/controls/temp2/meta/name", "Temp 2", true, 1);
    f.extClient.send("/devices/foo/controls/temp2", "43", true, 0);
    f.extClient.send("/devices/foo/controls/switch1/meta/type", "switch", true, 1);
    f.extClient.send("/devices/foo/controls/switch1/meta/name", "Switch 1", true, 1);
    f.extClient.send("/devices/foo/controls/switch1", "1", true, 0);
    f.extClient.send("/devices/foo/controls/switch2/meta/type", "switch", true, 1);
    f.extClient.send("/devices/foo/controls/switch2/meta/name", "Switch 2", true, 1);
    f.extClient.send("/devices/foo/controls/switch2", "0", true, 0);
    f.$rootScope.$digest();
  }));

  afterEach(() => {
    f.remove();
  });

  function extractCell (el) {
    el = $(el);
    var cellValue = el.find(".cell-value .value"),
        switchCell = el.find(".cell-switch");
    return {
      id: el.find(".cell-title .id").text().trim(),
      name: el.find(".cell-title .name").text().trim(),
      type: el.find(".cell-type-col").text().trim(),
      value: cellValue.size() ? cellValue.text().trim() - 0 :
        switchCell.size() ? !!switchCell.find(".switch-on").size() :
        "<unknown>"
    };
  }

  function verifyDashboard (el) {
    var name = $(el).text().trim();
    var dashboard = uiConfig.data.dashboards.find(dashboard => dashboard.name == name);
    expect(dashboard).not.toBeNull();
    if (dashboard)
      expect($(el).prop("hash")).toEqual("#/dashboards/" + dashboard.id);
    return name;
  }

  function extractWidgets () {
    var item, rowSpan = 0, result = [];
    f.container.find("table tbody tr").toArray().forEach(tr => {
      tr = $(tr);
      if (rowSpan) {
        --rowSpan;
        item.cells.push(extractCell(tr));
        return;
      }
      item = {
        name: $(tr).find(".name-col").text().trim(),
        description: $(tr).find(".description-col").text().trim(),
        dashboards: $(tr).find(".dashboards-col ul li a").toArray().map(verifyDashboard),
        cells: [ extractCell(tr) ]
      };
      if (tr.find(".name-col").prop("rowSpan") > 1)
        rowSpan = tr.find(".name-col").prop("rowSpan") - 1;
      result.push(item);
    });
    return result;
  }

  it("should list all the widges with their dashboards, cell lists, descriptions and values", () => {
    expect(extractWidgets()).toEqual([
      {
        name: "Switches",
        description: "Some switches",
        dashboards: ["Dashboard 1", "Dashboard 2"],
        cells: [
          {
            id: "foo/switch1",
            name: "Switch 1",
            type: "switch",
            value: true
          },
          {
            id: "foo/switch2",
            name: "Switch 2",
            type: "switch",
            value: false
          }
        ]
      },
      {
        name: "Temperatures",
        description: "Some temperatures",
        dashboards: ["Dashboard 1"],
        cells: [
          {
            id: "foo/temp1",
            name: "Temp 1",
            type: "temperature",
            value: 42
          },
          {
            id: "foo/temp2",
            name: "Temp 2",
            type: "temperature",
            value: 43
          }
        ]
      }
    ]);
  });

  it("should not display 'no widgets' placeholder when widget list is not empty", () => {
    expect(f.container.find(".empty-list")).not.toExist();
  });

  it("should display 'no widgets' placeholder and no table when widget list is empty", () => {
    uiConfig.data.dashboards = [];
    uiConfig.data.widgets = [];
    // must invoke $digest() on the root scope so uiConfig version
    // has a chance to update
    f.$rootScope.$digest();
    expect(f.container.find(".empty-list")).toExist();
    expect(f.container.find("table")).not.toExist();
  });

  function extractHistoryLinks () {
    return f.container.find("tbody > tr a.cell-history").toArray().map(a => a.hash);
  }

  it("should provide history links for cells", () => {
    var ts = "/1466121600000/-";
    expect(extractHistoryLinks()).toEqual([
      "#/history/foo/switch1" + ts,
      "#/history/foo/switch2" + ts,
      "#/history/foo/temp1" + ts,
      "#/history/foo/temp2" + ts,
    ]);
  });
  // TBD: preview
  // TBD: adding widgets
});
