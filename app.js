
// ========================================
// VAL WARTE CUSTOMER LOOKUP PORTAL
// Supabase Authentication & Customer Search
// ========================================

// SUPABASE CONFIGURATION
const SUPABASE_URL =
  "https://tjckvjlosntwfzsxuvoa.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Wvqed39tSxaRVTvw0iPrVw_vUkO9R0M";

// INITIALIZE SUPABASE
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// ========================================
// INTERFACE ELEMENTS
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
// LOGIN INTERFACE
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

// ========================================
// STAFF AUTHORIZATION
// ========================================

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

// ========================================
// TEMPORARY DATABASE DIAGNOSTIC
// Runs ONLY after staff authentication
// ========================================

async function testCustomerAccess() {
  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  const { data: staffAccess, error: staffError } =
    await supabaseClient.rpc("is_active_staff");

  const { data: customers, error: customerError } =
    await supabaseClient
      .from("customers")
      .select("customer_id, full_name")
      .limit(10);

  const diagnostic = {
    loggedIn: !!sessionData?.session,
    userId: sessionData?.session?.user?.id || null,
    staffAccess: staffAccess,
    staffError: staffError?.message || null,
    customerRecords: customers?.length ?? null,
    customerError: customerError?.message || null,
    sessionError: sessionError?.message || null
  };

  console.log("VAL WARTE DATABASE DIAGNOSTIC:", diagnostic);

  let panel = document.getElementById("database-diagnostic");

  if (!panel) {
    panel = document.createElement("pre");
    panel.id = "database-diagnostic";
    document.body.appendChild(panel);
  }

  panel.style.cssText = `
    padding: 15px;
    margin: 15px;
    background: #162840;
    color: white;
    border: 1px solid #48A9FF;
    border-radius: 8px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 13px;
  `;

  panel.textContent =
    "VAL WARTE DATABASE DIAGNOSTIC\n\n" +
    JSON.stringify(diagnostic, null, 2);

  return diagnostic;
}

// ========================================
// INITIALIZE EXISTING LOGIN SESSION
// ========================================

async function initializePortal() {
  showLogin();

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    const session = data.session;

    if (!session) return;

    const staff = await verifyActiveStaff(session.user);

    if (!staff) {
      await supabaseClient.auth.signOut();

      showLoginMessage(
        "Your account is not authorized for portal access."
      );

      return;
    }

    showPortal();

    // Run diagnostic AFTER authentication
    await testCustomerAccess();

  } catch (error) {
    console.error("Portal initialization error:", error);

    showLoginMessage(
      "Unable to verify your staff access. Please sign in again."
    );
  }
}

// ========================================
// STAFF LOGIN
// ========================================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document
    .getElementById("staff-email")
    .value.trim();

  const password = document
    .getElementById("staff-password")
    .value;

  const loginButton =
    document.getElementById("login-button");

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

    // Run diagnostic AFTER successful login
    await testCustomerAccess();

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

// ========================================
// STAFF LOGOUT
// ========================================

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  const { error } = await supabaseClient.auth.signOut();

  logoutButton.disabled = false;

  if (error) {
    console.error("Logout error:", error);
    alert("Unable to sign out. Please try again.");
    return;
  }

  loginForm.reset();

  showLogin();

  showLoginMessage(
    "You have successfully signed out.",
    "success"
  );

  const diagnostic =
    document.getElementById("database-diagnostic");

  if (diagnostic) diagnostic.remove();
});

// ========================================
// SEARCH HELPER FUNCTIONS
// ========================================

function createElement(tag, className, content) {
  const element = document.createElement(tag);

  if (className) element.className = className;

  if (content !== undefined) {
    element.textContent = content;
  }

  return element;
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

function showSearchMessage(message, type = "normal") {
  resultsContainer.replaceChildren();

  resultsContainer.appendChild(
    createElement(
      "div",
      `search-message ${type}`,
      message
    )
  );
}

function addDetail(container, label, value) {
  const detail = createElement("div", "customer-detail");

  detail.appendChild(
    createElement("span", "detail-label", label)
  );

  detail.appendChild(
    createElement(
      "span",
      "detail-value",
      value || "Not available"
    )
  );

  container.appendChild(detail);
}

// ========================================
// CUSTOMER PROFILE & ORDER RENDERING
// ========================================

function renderCustomers(customers, orders, items) {
  resultsContainer.replaceChildren();

  resultCount.textContent =
    `${customers.length} Customer${customers.length === 1 ? "" : "s"}`;

  customers.forEach(customer => {
    const customerCard = createElement(
      "article",
      "customer-result"
    );

    const customerHeader = createElement(
      "div",
      "customer-result-header"
    );

    customerHeader.appendChild(
      createElement(
        "h3",
        "customer-name",
        customer.full_name
      )
    );

    customerHeader.appendChild(
      createElement(
        "span",
        "customer-id-badge",
        customer.customer_id
      )
    );

    customerCard.appendChild(customerHeader);

    const profileGrid = createElement(
      "div",
      "customer-details-grid"
    );

    addDetail(profileGrid, "Email Address", customer.email);
    addDetail(profileGrid, "Phone Number", customer.phone);
    addDetail(profileGrid, "Mailing Address", customer.mailing_address);
    addDetail(profileGrid, "Customer Since", formatDate(customer.created_at));

    customerCard.appendChild(profileGrid);

    const customerOrders = orders.filter(
      order => order.customer_id === customer.customer_id
    );

    customerCard.appendChild(
      createElement(
        "h4",
        "order-history-heading",
        `ORDER HISTORY (${customerOrders.length})`
      )
    );

    if (customerOrders.length === 0) {
      customerCard.appendChild(
        createElement(
          "p",
          "empty-orders",
          "No order history available."
        )
      );
    }

    customerOrders.forEach(order => {
      const orderCard = createElement("div", "order-card");

      const orderTop = createElement(
        "div",
        "order-card-header"
      );

      orderTop.appendChild(
        createElement("strong", "order-id", order.order_id)
      );

      orderTop.appendChild(
        createElement("span", "order-status", order.order_status)
      );

      orderCard.appendChild(orderTop);

      const orderDetails = createElement(
        "div",
        "order-details-grid"
      );

      addDetail(orderDetails, "Order Date", formatDate(order.order_date));
      addDetail(orderDetails, "Payment Method", order.payment_method);
      addDetail(orderDetails, "Payment Status", order.payment_status);
      addDetail(orderDetails, "Total Amount", formatPHP(order.total_amount_php));
      addDetail(orderDetails, "Courier", order.courier);
      addDetail(orderDetails, "Tracking Number", order.tracking_number);
      addDetail(orderDetails, "Delivery Date", formatDate(order.delivery_date));

      orderCard.appendChild(orderDetails);

      const orderItems = items.filter(
        item => item.order_id === order.order_id
      );

      orderCard.appendChild(
        createElement(
          "p",
          "order-items-heading",
          "PURCHASED ITEMS"
        )
      );

      orderItems.forEach(item => {
        const itemRow = createElement("div", "order-item");

        itemRow.appendChild(
          createElement(
            "span",
            "item-name",
            `${item.product_name} × ${item.quantity}`
          )
        );

        itemRow.appendChild(
          createElement(
            "span",
            "item-price",
            formatPHP(item.line_total_php)
          )
        );

        orderCard.appendChild(itemRow);
      });

      customerCard.appendChild(orderCard);
    });

    resultsContainer.appendChild(customerCard);
  });
}

// ========================================
// CUSTOMER ACCOUNT SEARCH ENGINE
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

  const hasOrderCriteria = Boolean(
    search.orderId || search.tracking
  );

  const hasCustomerCriteria = Boolean(
    search.fullName ||
    search.customerId ||
    search.phone ||
    search.email ||
    search.address
  );

  if (!hasOrderCriteria && !hasCustomerCriteria) {
    showSearchMessage(
      "Please enter at least one customer detail to search.",
      "error"
    );
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "SEARCHING...";

  resultCount.textContent = "Searching...";

  showSearchMessage(
    "Searching customer records...",
    "loading"
  );

  try {
    // Confirm active session before searching
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    let matchingOrderCustomerIds = null;

    // SEARCH BY ORDER ID OR TRACKING NUMBER
    if (hasOrderCriteria) {
      let orderQuery = supabaseClient
        .from("orders")
        .select("customer_id");

      if (search.orderId) {
        orderQuery = orderQuery.eq(
          "order_id",
          search.orderId
        );
      }

      if (search.tracking) {
        orderQuery = orderQuery.eq(
          "tracking_number",
          search.tracking
        );
      }

      const { data: matchingOrders, error: orderError } =
        await orderQuery;

      if (orderError) throw orderError;

      matchingOrderCustomerIds = [
        ...new Set(
          (matchingOrders || []).map(
            order => order.customer_id
          )
        )
      ];

      if (matchingOrderCustomerIds.length === 0) {
        resultCount.textContent = "0 Customers";

        showSearchMessage(
          "No customer records found matching your search.",
          "empty"
        );

        return;
      }
    }

    // SEARCH CUSTOMER PROFILE
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
      customerQuery = customerQuery.eq(
        "phone",
        search.phone
      );
    }

    if (search.email) {
      customerQuery = customerQuery.ilike(
        "email",
        search.email
      );
    }

    if (search.address) {
      customerQuery = customerQuery.ilike(
        "mailing_address",
        `%${search.address}%`
      );
    }

    if (matchingOrderCustomerIds !== null) {
      customerQuery = customerQuery.in(
        "customer_id",
        matchingOrderCustomerIds
      );
    }

    const { data: customers, error: customerError } =
      await customerQuery;

    if (customerError) throw customerError;

    if (!customers || customers.length === 0) {
      resultCount.textContent = "0 Customers";

      showSearchMessage(
        "No customer records found matching your search.",
        "empty"
      );

      return;
    }

    // RETRIEVE ALL ORDERS FOR MATCHING CUSTOMERS
    const customerIds = customers.map(
      customer => customer.customer_id
    );

    const { data: orders, error: ordersError } =
      await supabaseClient
        .from("orders")
        .select("*")
        .in("customer_id", customerIds)
        .order("order_date", { ascending: false });

    if (ordersError) throw ordersError;

    const orderIds = (orders || []).map(
      order => order.order_id
    );

    // RETRIEVE PURCHASED ITEMS
    let items = [];

    if (orderIds.length > 0) {
      const { data: orderItems, error: itemsError } =
        await supabaseClient
          .from("order_items")
          .select("*")
          .in("order_id", orderIds);

      if (itemsError) throw itemsError;

      items = orderItems || [];
    }

    renderCustomers(
      customers,
      orders || [],
      items
    );

  } catch (error) {
    console.error("Customer search error:", error);

    resultCount.textContent = "Search Error";

    showSearchMessage(
      error.message || "Unable to retrieve customer records.",
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
    "Enter a customer detail above to search for an account."
  );
});

// ========================================
// START PORTAL
// ========================================

initializePortal();
