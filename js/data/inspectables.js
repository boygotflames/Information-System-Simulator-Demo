export const INSPECTABLES = [
  {
    id: "pos_terminal_1",
    x: 120,
    y: 110,
    width: 80,
    height: 50,
    color: "#38bdf8",
    name: "POS Terminal",
    type: "Hardware",
    isRole: "TPS / Hardware / Software Interface",
    description:
      "The POS terminal is a hardware device used to capture student payments, display order details, and send transaction data into the canteen information system.",
    recipe: null
  },
  {
    id: "ramen_stall_1",
    x: 260,
    y: 90,
    width: 150,
    height: 90,
    color: "#22c55e",
    name: "Ramen Stall",
    type: "Process Node",
    isRole: "Process / TPS / Data Source",
    description:
      "The ramen stall represents the full business process: ordering, paying, cooking, and serving. It is where transaction data is created and inventory is consumed.",
    recipe: "Tonkotsu Ramen Standard Recipe"
  },
  {
    id: "manager_desk_1",
    x: 500,
    y: 100,
    width: 120,
    height: 70,
    color: "#f59e0b",
    name: "Canteen Manager",
    type: "People",
    isRole: "MIS / DSS / ESS User",
    description:
      "The manager uses reports, summaries, and alerts to monitor sales, spot shortages, and make operational decisions for the canteen."
  },
  {
    id: "cook_station_1",
    x: 700,
    y: 95,
    width: 130,
    height: 85,
    color: "#ef4444",
    name: "Cook Station",
    type: "People + Knowledge Support",
    isRole: "KMS / Operational Process",
    description:
      "The cook station shows how staff use stored knowledge such as recipes, preparation standards, and workflow instructions to maintain consistency.",
    recipe: "Noodle Prep Guide v1"
  }
];