// Preview-only sample data. Written straight into this page's own browser storage before
// the app starts; this preview has no cloud config, so none of it can reach Supabase.
(function () {
  var SEED_VERSION = "3";
  var P = "shift::";
  try {
    if (localStorage.getItem("shift-preview-seed") === SEED_VERSION) return;
  } catch (e) { return; }

  var pad = function (n) { return String(n).padStart(2, "0"); };
  var day = function (off) {
    var d = new Date(); d.setDate(d.getDate() + off);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };
  var at = function (off, hm) { return day(off) + "T" + hm; };
  var ago = function (hours) { return Date.now() - hours * 3600e3; };

  var places = [
    { id: "pl-home", name: "Home", lat: 51.5226, lng: -0.1571 },
    { id: "pl-office", name: "Office", lat: 51.5155, lng: -0.0922 },
    { id: "pl-gym", name: "Gym", lat: 51.5098, lng: -0.1180 },
    { id: "pl-market", name: "Borough Market", lat: 51.5055, lng: -0.0910 },
    { id: "pl-cafe", name: "Nook Café", lat: 51.5136, lng: -0.1365 },
  ];
  var contacts = [
    { id: "c-maya", name: "Maya Chen", contactKind: "Person", groups: ["Friends"], phone: "+44 7700 900123", email: "maya@example.com", relations: [{ to: "c-leo", modelId: "friend" }] },
    { id: "c-leo", name: "Leo Park", contactKind: "Person", groups: ["Team"], email: "leo@northwind.example", relations: [{ to: "c-northwind", modelId: "employee" }] },
    { id: "c-northwind", name: "Northwind Ltd", contactKind: "Company", groups: ["Clients"], relations: [] },
    { id: "c-ellis", name: "Dr. Ellis", contactKind: "Person", groups: ["Health"], phone: "+44 20 7946 0000", relations: [] },
    { id: "c-nina", name: "Nina Rossi", contactKind: "Person", groups: ["Family"], relations: [{ to: "c-tom", modelId: "sister" }] },
    { id: "c-tom", name: "Tom Rossi", contactKind: "Person", groups: ["Family"], relations: [] },
    { id: "c-sam", name: "Sam Okafor", contactKind: "Person", groups: ["Team"], relations: [{ to: "c-leo", modelId: "colleague" }] },
    { id: "c-priya", name: "Priya Shah", contactKind: "Person", groups: ["Clients"], relations: [{ to: "c-northwind", modelId: "employee" }] },
    { id: "c-omar", name: "Omar Haddad", contactKind: "Person", groups: ["Friends"], relations: [] },
    { id: "c-julia", name: "Julia Meyer", contactKind: "Person", groups: ["Team"], relations: [] },
    { id: "c-ken", name: "Ken Ito", contactKind: "Person", groups: ["Friends"], relations: [] },
    { id: "c-acme", name: "Acme Plumbing", contactKind: "Company", groups: ["Services"], phone: "+44 20 7946 0999", relations: [] },
  ];
  var peopleGroups = ["Family", "Friends", "Team", "Clients", "Health", "Services"];
  var labels = [
    { name: "q3-launch", color: "#7CA0E8" }, { name: "waiting", color: "#E0B341" },
    { name: "quick-win", color: "#63C9A8" }, { name: "health", color: "#E08A7C" },
    { name: "reading", color: "#C58FD4" },
  ];
  var sections = [
    { id: "sec-work", name: "Work focus", domainActive: { Personal: false }, categoryActive: {}, typeActive: {}, labelActive: {} },
    { id: "sec-fun", name: "To discover", domainActive: {}, categoryActive: {}, typeActive: { Note: false, Task: false, Remember: false, Pay: false, Idea: false, Event: false, Info: false, Bookmark: false, Routine: false }, labelActive: {} },
  ];

  var base = {
    title: "", content: "", extra: "", labels: [], contacts: [], assignees: [], places: [], relatedDates: [],
    images: [], attachments: [], checklist: [], domain: null, category: null, type: "Note", triggers: [],
    trigger: null, reminder: null, priority: null, effort: null, queue: null, status: null, deadline: null,
    recommendedDate: null, critical: false, doneAt: null, archived: false, pinned: false, referrer: null,
    discoverClass: null, fileReason: null, routineKind: null, routineRecurring: null,
    parent: null, children: [], blockers: [], blocking: [], related: [], source: "typed",
  };
  var i = 0;
  var note = function (o) {
    var n = Object.assign({}, base, { id: "s" + (++i), createdAt: ago(i * 5) }, o);
    if (n.triggers.length && !n.trigger) n.trigger = n.triggers[0];
    return n;
  };
  var ck = function (text, done) { return { id: "ck" + Math.random().toString(36).slice(2, 8), text: text, done: !!done }; };

  var notes = [
    note({ id: "s-launch", title: "Ship Q3 pricing page", type: "Task", domain: "Work", category: "Core",
      content: "Final copy + design sign-off, then deploy behind the feature flag.",
      extra: "# Launch plan\n## Before launch\n1. Legal review of the pricing table\n2. Update screenshots\n3. QA on mobile\n- [ ] Tell support team\n- [x] Draft announcement\n> Keep the old page live for a week.\n\n**Owner:** Leo · *Due:* this week\n\n---\nSee https://example.com/pricing-spec",
      priority: 1, effort: 3, queue: "Now!", status: "Doing", deadline: day(1), pinned: true,
      labels: ["q3-launch"], contacts: ["c-leo"], assignees: ["c-sam", "c-julia"],
      checklist: [ck("Copy approved", true), ck("Design approved", true), ck("Feature flag on"), ck("Announce in #general")],
      children: ["s-screens"], related: ["s-idea"] }),
    note({ id: "s-screens", title: "Update product screenshots", type: "Task", domain: "Work", category: "Product",
      content: "Retake the dashboard screenshots with the new nav.", priority: 4, effort: 2, queue: "Follow",
      status: "To Do", parent: "s-launch", labels: ["q3-launch", "quick-win"] }),
    note({ id: "s-contract", title: "Sign Northwind contract", type: "Task", domain: "Work", category: "Business",
      content: "Waiting on their legal team to return the redlines.", priority: 2, effort: 1, queue: "Planned",
      status: "Ready", contacts: ["c-northwind", "c-priya"], labels: ["waiting"], blocking: ["s-onboard"] }),
    note({ id: "s-onboard", title: "Kick off Northwind onboarding", type: "Task", domain: "Work", category: "Business",
      content: "Book the kickoff call once the contract is signed.", priority: 2, effort: 4, queue: "Next",
      status: "Backlog", blockers: ["s-contract"], contacts: ["c-priya"],
      triggers: [{ kind: "date", at: at(3, "10:00") }, { kind: "custom", name: "At the office" }] }),
    note({ title: "Send weekly metrics email", type: "Task", domain: "Work", category: "Market",
      content: "Signups, churn, and trial conversions.", priority: 3, effort: 1, queue: "Now!", status: "Done",
      doneAt: new Date(ago(20)).toISOString(), archived: true, labels: ["quick-win"] }),
    note({ title: "Fix leaking kitchen tap", type: "Task", domain: "Personal", category: "Home",
      content: "Buy a new washer, or call the plumber if that doesn't work.", priority: 3, effort: 2, queue: "Soon",
      status: "To Do", recommendedDate: day(0), contacts: ["c-acme"],
      triggers: [{ kind: "location", place: places[0] }] }),
    note({ title: "Renew passport", type: "Task", domain: "Personal", category: "Admin",
      content: "Photos are in the drawer. Form is online.", priority: 1, effort: 3, queue: "Now!", status: "To Do",
      deadline: day(-2), critical: true }),
    note({ title: "Pay electricity bill", type: "Pay", domain: "Personal", category: "Money",
      content: "£84.20, account ending 4471.", deadline: day(5), recommendedDate: day(3), priority: 2,
      reminder: { kind: "once", at: at(3, "09:00") } }),
    note({ title: "Maya's birthday", type: "Remember", domain: "Personal", category: "People",
      content: "Likes jazz records and dark chocolate.", contacts: ["c-maya"],
      reminder: { kind: "repeat", every: 1, unit: "year", at: at(6, "09:00") } }),
    note({ title: "Water the plants", type: "Remember", domain: "Personal", category: "Home",
      content: "Balcony ones need more in summer.",
      reminder: { kind: "repeat", every: 1, unit: "week", at: at(0, "08:00"), daysOfWeek: [1, 4] } }),
    note({ id: "s-idea", title: "Annual plan discount", type: "Idea", domain: "Work", category: "Market",
      content: "Offer two months free on annual billing to lift conversions.", labels: ["q3-launch"], related: ["s-launch"] }),
    note({ title: "Past Lives", type: "Discover", discoverClass: "Movie", domain: "Personal", category: "Wellness",
      content: "Maya says it's the best film she's seen this year.", referrer: "c-maya", queue: "Upcoming" }),
    note({ title: "Try the ramen place", type: "Discover", discoverClass: "Restaurant", domain: "Personal",
      category: "People", content: "Near Borough Market, go on a weekday to skip the queue.", places: ["pl-market"],
      referrer: "c-omar", queue: "Later" }),
    note({ title: "Thinking, Fast and Slow", type: "Discover", discoverClass: "Book", domain: "Personal",
      category: "Wellness", content: "Recommended in the leadership course.", queue: "Future", labels: ["reading"] }),
    note({ title: "Northwind quarterly review", type: "Event", domain: "Work", category: "Business",
      content: "Bring the usage report and renewal proposal.", contacts: ["c-leo", "c-priya"],
      triggers: [{ kind: "date", at: at(2, "14:00") }, { kind: "location", place: places[1] }],
      relatedDates: [day(9), at(16, "11:00")] }),
    note({ title: "Dentist check-up", type: "Event", domain: "Personal", category: "Wellness",
      content: "Arrive 10 minutes early.", contacts: ["c-ellis"], labels: ["health"],
      triggers: [{ kind: "date", at: at(6, "08:30") }] }),
    note({ title: "Home Wi-Fi details", type: "Info", domain: "Personal", category: "Home",
      content: "Network and router info for guests.",
      extra: "## Guest network\n- Name: **Nook-Guest**\n- Password: `sample-password`\n\n## Router\nAdmin page is at `192.168.1.1`." }),
    note({ title: "Design system docs", type: "Bookmark", domain: "Work", category: "Product",
      content: "https://example.com/design-system — reference for components and tokens." }),
    note({ title: "Morning stretch", type: "Routine", routineKind: "Selfcare", domain: "Personal", category: "Wellness",
      content: "10 minutes, before coffee.", routineRecurring: { kind: "repeat", every: 1, unit: "day", at: at(0, "07:00"), daysOfWeek: [] } }),
    note({ title: "Gym session", type: "Routine", routineKind: "Grow", domain: "Personal", category: "Wellness",
      content: "Strength on Monday and Friday, cardio on Wednesday.", places: ["pl-gym"],
      routineRecurring: { kind: "repeat", every: 1, unit: "week", at: at(0, "18:30"), daysOfWeek: [1, 3, 5] } }),
    note({ title: "Monthly budget review", type: "Routine", routineKind: "Organize", domain: "Personal", category: "Money",
      content: "Check subscriptions and savings goal.",
      routineRecurring: { kind: "repeat", every: 1, unit: "month", at: at(4, "20:00"), daysOfWeek: [] } }),
    note({ title: "خرید نان و پنیر", type: "Task", domain: "Personal", category: "Home",
      content: "یادداشت نمونه برای آزمایش متن راست‌به‌چپ.", effort: 1, queue: "Soon", status: "To Do" }),
    note({ content: "Random thought: a shared grocery list with Nina would save so many trips." }),
    note({ title: "Call about gym membership", content: "Ask whether the off-peak plan includes weekends." }),
    note({ title: "Old conference notes", type: "Note", domain: "Work", category: "Core",
      content: "Kept for reference.", archived: true }),
    note({ title: "Draft I didn't need", content: "This sample note is in the Trash.", trashedAt: ago(24) }),
  ];

  var put = function (k, v) { localStorage.setItem(P + k, JSON.stringify(v)); };
  try {
    put("sift-notes", notes); put("sift-places", places); put("sift-contacts", contacts);
    put("sift-labels", labels); put("sift-sections", sections); put("sift-people-groups", peopleGroups);
    localStorage.setItem("shift-preview-seed", SEED_VERSION);
  } catch (e) {}
})();

function shiftResetSamples() {
  try {
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf("shift") === 0) localStorage.removeItem(k);
    });
  } catch (e) {}
  location.reload();
}
