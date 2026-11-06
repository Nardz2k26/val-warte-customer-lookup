
// ========================================
// VAL WARTE CUSTOMER ACCOUNT LOOKUP
// Supabase Authentication & Search
// ========================================

const SUPABASE_URL =
  "https://tjckvjlosntwfzsxuvoa.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Wvqed39tSxaRVTvw0iPrVw_vUkO9R0M";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// ========================================
// ELEMENTS
// ========================================

const loginScreen = document.getElementById("login-screen");
const portalHeader = document.getElementById("portal-header");
const portalApp = document.getElementById("portal-app");

const loginForm = document.getElementById("staff-login-form");
const loginMessage = document.getElementById("login-message");
const logoutButton = document.getElementById("logout-button");

const customerSearchForm =
  document.getElementById("customer-search-form");

const resultsContainer =
  document.getElementById("results-container");

const resultCount =
  document.getElementById("result-count");

const searchButton =
  document.getElementById("search-button");

// ========================================
// AUTHENTICATION
// ========================================

function showLoginMessage(message, type = "error") {
  loginMessage.textContent = message;
  loginMessage.style.color =
    type === "success" ? "#27AE60" : "#E05252";
}

function showPortal() {
  loginScreen.hidden = true;
  portalHeader.hidden = false;
  portalApp.hidden = false;
}

function showLogin() {
  loginScreen.hidden = false;
  portalHeader.hidden = true;
  portalApp.hidden = true;
}

async function verifyActiveStaff(user) {
  const { data, error } = await supabaseClient
    .from("staff_accounts")
    .select("staff_id, full_name, role, status")
    .eq("auth_user_id", user.id)
    .eq("status", "Active")
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function initializePortal() {
  showLogin();

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;
    if (!data.session) return;

    const staff = await verifyActiveStaff(data.session.user);

    if (!staff) {
      await supabaseClient.auth.signOut();
      showLoginMessage(
        "Your account is not authorized for portal access."
      );
      return;
    }

    showPortal();

  } catch (error) {
    console.error("Portal initialization error:", error);
    showLoginMessage(
      "Unable to verify your staff access. Please sign in again."
    );
  }
}

// LOGIN

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("staff-email").value.trim();
  const password = document.getElementById("staff-password").value;
  const loginButton = document.getElementById("login-button");

  loginButton.disabled = true;
  loginButton.textContent = "SIGNING IN...";
  showLoginMessage("");

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    const staff = await verifyActiveStaff(data.user);

    if (!staff) {
      await supabaseClient.auth.signOut();
      showLoginMessage(
        "Access denied. Your staff account is inactive or unauthorized."
      );
      return;
    }

    showPortal();

  } catch (error) {
    console.error("Login error:", error);

    showLoginMessage(
      error.message === "Invalid login credentials"
        ? "Incorrect email or password."
        : "Unable to sign in. Please check your account and try again."
    );

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "SIGN IN";
  }
});

// LOGOUT

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  const { error } = await supabaseClient.auth.signOut();

  logoutButton.disabled = false;

  if (error) {
    alert("Unable to sign out. Please try again.");
    return;
  }

  loginForm.reset();
  customerSearchForm.reset();
  showLogin();
  showLoginMessage("You have successfully signed out.", "success");
});

// ========================================
// DISPLAY HELPERS
// ========================================

function createElement(tag, className, content) {
  const element = document.createElement(tag);

  if (className) element.className = className;

  if (content !== undefined && content !== null) {
    element.textContent = String(content);
  }

  return element;
}

function showSearchMessage(message, type = "normal") {
  resultsContainer.replaceChildren();

  resultsContainer.appendChild(
    createElement("div", `search-message ${type}`, message)
  );
}

function formatPHP(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(amount || 0));
}

function formatDate(date) {
  if (!date) return "Not available";

  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function addTableCell(row, value) {
  const cell = createElement("td", "", value || "Not available");
  row.appendChild(cell);
  return cell;
}

function addTableLink(row, value, action, id) {
  const cell = createElement("td");
  const link = createElement("a", "", value || "Not available");

  link.href = "#";
  link.dataset.action = action;
  link.dataset.id = id;

  cell.appendChild(link);
  row.appendChild(cell);

  return cell;
}

function createResultsTable(headers) {
  const wrapper = createElement("div", "results-table-wrapper");
  const table = createElement("table", "results-table");
  const thead = createElement("thead");
  const headerRow = createElement("tr");

  headers.forEach(header => {
    headerRow.appendChild(createElement("th", "", header));
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = createElement("tbody");
  table.appendChild(tbody);
  wrapper.appendChild(table);

  return { wrapper, tbody };
}

// ========================================
// CUSTOMER SEARCH RESULTS
// ========================================

function renderCustomerResults(customers) {
  resultsContainer.replaceChildren();

  resultCount.textContent =
    `${customers.length} Customer${customers.length === 1 ? "" : "s"}`;

  const { wrapper, tbody } = createResultsTable([
    "Full Name",
    "Customer ID",
    "Phone Number",
    "Email Address",
    "Mailing Address"
  ]);

  customers.forEach(customer => {
    const row = createElement("tr");

    addTableLink(
      row,
      customer.full_name,
      "customer",
      customer.customer_id
    );

    addTableLink(
      row,
      customer.customer_id,
      "customer",
      customer.customer_id
    );

    addTableCell(row, customer.phone);
    addTableCell(row, customer.email);
    addTableCell(row, customer.mailing_address);

    tbody.appendChild(row);
  });

  resultsContainer.appendChild(wrapper);
}

// ========================================
// ORDER SEARCH RESULTS
// ========================================

function renderOrderResults(orders, customerMap) {
  resultsContainer.replaceChildren();

  resultCount.textContent =
    `${orders.length} Matched Order${orders.length === 1 ? "" : "s"}`;

  const { wrapper, tbody } = createResultsTable([
    "Order ID",
    "Tracking Number",
    "Customer ID",
    "Full Name"
  ]);

  orders.forEach(order => {
    const customer = customerMap[order.customer_id];
    const row = createElement("tr");

    addTableLink(
      row,
      order.order_id,
      "order",
      order.order_id
    );

    addTableLink(
      row,
      order.tracking_number,
      "tracking",
      order.order_id
    );

    addTableLink(
      row,
      order.customer_id,
      "customer",
      order.customer_id
    );

    addTableLink(
      row,
      customer?.full_name || "Not available",
      "customer",
      order.customer_id
    );

    tbody.appendChild(row);
  });

  resultsContainer.appendChild(wrapper);
}

// ========================================
// DETAIL VIEW
// ========================================

function showDetailHeading(title, subtitle) {
  const panel = createElement("section", "detail-panel");

  panel.appendChild(createElement("h3", "", title));

  if (subtitle) {
    panel.appendChild(
      createElement("p", "", subtitle)
    );
  }

  const backButton = createElement("button", "", "Back to Search Results");
  backButton.type = "button";
  backButton.addEventListener("click", () => {
    const previousResults = document.getElementById("previous-results");

    if (previousResults) {
      resultsContainer.replaceChildren(
        previousResults.cloneNode(true)
      );
    }
  });

  panel.appendChild(backButton);
  return panel;
}

function addDetailField(grid, label, value) {
  const field = createElement("div", "detail-field");

  field.appendChild(
    createElement("span", "detail-label", label)
  );

  field.appendChild(
    createElement("span", "detail-value", value || "Not available")
  );

  grid.appendChild(field);
}

async function openCustomerDetails(customerId) {
  const { data: customer, error } = await supabaseClient
    .from("customers")
    .select("*")
    .eq("customer_id", customerId)
    .single();

  if (error) throw error;

  const { data: orders, error: ordersError } =
    await supabaseClient
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .order("order_date", { ascending: false });

  if (ordersError) throw ordersError;

  const panel = showDetailHeading(
    "CUSTOMER PROFILE",
    "Complete customer information"
  );

  const grid = createElement("div", "detail-grid");

  addDetailField(grid, "Full Name", customer.full_name);
  addDetailField(grid, "Customer ID", customer.customer_id);
  addDetailField(grid, "Phone Number", customer.phone);
  addDetailField(grid, "Email Address", customer.email);
  addDetailField(grid, "Mailing Address", customer.mailing_address);
  addDetailField(grid, "Customer Since", formatDate(customer.created_at));

  panel.appendChild(grid);

  panel.appendChild(
    createElement("h4", "", `ORDER HISTORY (${orders.length})`)
  );

  const { wrapper, tbody } = createResultsTable([
    "Order ID",
    "Order Date",
    "Order Status",
    "Payment Status",
    "Total Amount"
  ]);

  orders.forEach(order => {
    const row = createElement("tr");

    addTableLink(row, order.order_id, "order", order.order_id);
    addTableCell(row, formatDate(order.order_date));
    addTableCell(row, order.order_status);
    addTableCell(row, order.payment_status);
    addTableCell(row, formatPHP(order.total_amount_php));

    tbody.appendChild(row);
  });

  panel.appendChild(wrapper);
  resultsContainer.replaceChildren(panel);
  resultCount.textContent = "Customer Profile";
}

async function openOrderDetails(orderId) {
  const { data: order, error } = await supabaseClient
    .from("orders")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (error) throw error;

  const { data: items, error: itemsError } =
    await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

  if (itemsError) throw itemsError;

  const panel = showDetailHeading(
    "ORDER DETAILS",
    `Order reference: ${order.order_id}`
  );

  const grid = createElement("div", "detail-grid");

  addDetailField(grid, "Order ID", order.order_id);
  addDetailField(grid, "Customer ID", order.customer_id);
  addDetailField(grid, "Order Date", formatDate(order.order_date));
  addDetailField(grid, "Order Status", order.order_status);
  addDetailField(grid, "Payment Method", order.payment_method);
  addDetailField(grid, "Payment Status", order.payment_status);
  addDetailField(grid, "Subtotal", formatPHP(order.subtotal_php));
  addDetailField(grid, "Shipping Fee", formatPHP(order.shipping_fee_php));
  addDetailField(grid, "Total Amount", formatPHP(order.total_amount_php));
  addDetailField(grid, "Courier", order.courier);
  addDetailField(grid, "Tracking Number", order.tracking_number);
  addDetailField(grid, "Shipping Address", order.shipping_address);
  addDetailField(grid, "Delivery Date", formatDate(order.delivery_date));

  panel.appendChild(grid);
  panel.appendChild(createElement("h4", "", "PURCHASED ITEMS"));

  const { wrapper, tbody } = createResultsTable([
    "Product SKU",
    "Product Name",
    "Quantity",
    "Unit Price",
    "Line Total"
  ]);

  items.forEach(item => {
    const row = createElement("tr");

    addTableCell(row, item.product_sku);
    addTableCell(row, item.product_name);
    addTableCell(row, item.quantity);
    addTableCell(row, formatPHP(item.unit_price_php));
    addTableCell(row, formatPHP(item.line_total_php));

    tbody.appendChild(row);
  });

  panel.appendChild(wrapper);
  resultsContainer.replaceChildren(panel);
  resultCount.textContent = "Order Details";
}

async function openTrackingDetails(orderId) {
  const { data: order, error } = await supabaseClient
    .from("orders")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (error) throw error;

  const panel = showDetailHeading(
    "TRACKING DETAILS",
    "Shipment information available in the demo database"
  );

  const grid = createElement("div", "detail-grid");

  addDetailField(grid, "Tracking Number", order.tracking_number);
  addDetailField(grid, "Order ID", order.order_id);
  addDetailField(grid, "Courier", order.courier);
  addDetailField(grid, "Order Status", order.order_status);
  addDetailField(grid, "Shipping Address", order.shipping_address);
  addDetailField(grid, "Delivery Date", formatDate(order.delivery_date));

  panel.appendChild(grid);
  panel.appendChild(
    createElement(
      "p",
      "",
      "Note: This demo displays stored tracking information. Live courier updates require a courier tracking integration."
    )
  );

  resultsContainer.replaceChildren(panel);
  resultCount.textContent = "Tracking Details";
}

// ========================================
// CLICKABLE SEARCH RESULT ACTIONS
// ========================================

resultsContainer.addEventListener("click", async event => {
  const link = event.target.closest("a[data-action]");

  if (!link) return;

  event.preventDefault();

  const action = link.dataset.action;
  const id = link.dataset.id;

  const previousResults = createElement("div");
  previousResults.id = "previous-results";

  // Preserve the current results for the back action.
  previousResults.append(...Array.from(resultsContainer.childNodes).map(
    node => node.cloneNode(true)
  ));

  resultsContainer.replaceChildren(
    createElement("div", "search-message loading", "Loading details...")
  );

  try {
    if (action === "customer") {
      await openCustomerDetails(id);
    } else if (action === "order") {
      await openOrderDetails(id);
    } else if (action === "tracking") {
      await openTrackingDetails(id);
    }

    // Attach saved results to the detail panel for the back button.
    const panel = resultsContainer.querySelector(".detail-panel");
    if (panel) panel.appendChild(previousResults);

  } catch (error) {
    console.error("Detail view error:", error);
    showSearchMessage(
      error.message || "Unable to load the requested details.",
      "error"
    );
  }
});

// ========================================
// SEARCH ENGINE
// ========================================

customerSearchForm.addEventListener("submit", async event => {
  event.preventDefault();

  const search = {
    orderId: document.getElementById("order-id").value.trim(),
    tracking: document.getElementById("tracking-number").value.trim(),
    fullName: document.getElementById("full-name").value.trim(),
    customerId: document.getElementById("customer-id").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    address: document.getElementById("mailing-address").value.trim()
  };

  const hasOrderCriteria = Boolean(search.orderId || search.tracking);

  const hasCustomerCriteria = Boolean(
    search.fullName ||
    search.customerId ||
    search.phone ||
    search.email ||
    search.address
  );

  if (!hasOrderCriteria && !hasCustomerCriteria) {
    showSearchMessage(
      "Please enter at least one search detail.",
      "error"
    );
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "SEARCHING...";
  resultCount.textContent = "Searching...";

  showSearchMessage("Searching records...", "loading");

  try {
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    let matchedOrders = null;
    let customerIdsFromOrders = null;

    // ORDER ID / TRACKING NUMBER SEARCH
    if (hasOrderCriteria) {
      let orderQuery = supabaseClient
        .from("orders")
        .select("*");

      if (search.orderId) {
        orderQuery = orderQuery.eq("order_id", search.orderId);
      }

      if (search.tracking) {
        orderQuery = orderQuery.eq(
          "tracking_number",
          search.tracking
        );
      }

      const { data, error } = await orderQuery;

      if (error) throw error;

      matchedOrders = data || [];

      if (matchedOrders.length === 0) {
        resultCount.textContent = "0 Matched Orders";
        showSearchMessage(
          "No matching order or tracking record was found.",
          "empty"
        );
        return;
      }

      customerIdsFromOrders = [
        ...new Set(matchedOrders.map(order => order.customer_id))
      ];
    }

    // CUSTOMER SEARCH
    let customerQuery = supabaseClient
      .from("customers")
      .select("*");

    if (search.customerId) {
      customerQuery = customerQuery.eq(
        "customer_id",
        search.customerId
      );
    }

    if (search.fullName) {
      customerQuery = customerQuery.ilike(
        "full_name",
        `%${search.fullName}%`
      );
    }

    if (search.phone) {
      customerQuery = customerQuery.eq("phone", search.phone);
    }

    if (search.email) {
      customerQuery = customerQuery.ilike("email", search.email);
    }

    if (search.address) {
      customerQuery = customerQuery.ilike(
        "mailing_address",
        `%${search.address}%`
      );
    }

    if (customerIdsFromOrders !== null) {
      customerQuery = customerQuery.in(
        "customer_id",
        customerIdsFromOrders
      );
    }

    const { data: customers, error: customerError } =
      await customerQuery;

    if (customerError) throw customerError;

    if (!customers || customers.length === 0) {
      resultCount.textContent = "0 Records";
      showSearchMessage(
        "No matching customer records were found.",
        "empty"
      );
      return;
    }

    // ORDER SEARCH: DISPLAY ONLY MATCHED ORDERS
    if (hasOrderCriteria) {
      const customerMap = {};

      customers.forEach(customer => {
        customerMap[customer.customer_id] = customer;
      });

      renderOrderResults(matchedOrders, customerMap);
      return;
    }

    // CUSTOMER SEARCH: DISPLAY CUSTOMER TABLE
    renderCustomerResults(customers);

  } catch (error) {
    console.error("Search error:", error);

    resultCount.textContent = "Search Error";

    showSearchMessage(
      error.message || "Unable to retrieve records.",
      "error"
    );

  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Search Accounts";
  }
});

// ========================================
// CLEAR SEARCH
// ========================================

customerSearchForm.addEventListener("reset", () => {
  resultCount.textContent = "0 Records";

  showSearchMessage(
    "Enter a customer or order detail above to search."
  );
});

// ========================================
// START PORTAL
// ========================================

initializePortal();
