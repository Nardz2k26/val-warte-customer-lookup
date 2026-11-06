
// ========================================
// VAL WARTE CUSTOMER LOOKUP PORTAL
// Supabase Authentication
// ========================================

const SUPABASE_URL =
  "https://tjckvjlosntwfzsxuvoa.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Wvqed39tSxaRVTvw0iPrVw_vUkO9R0M";

// Initialize Supabase
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// Interface elements
const loginScreen = document.getElementById("login-screen");
const portalHeader = document.getElementById("portal-header");
const portalApp = document.getElementById("portal-app");

const loginForm = document.getElementById("staff-login-form");
const loginMessage = document.getElementById("login-message");
const logoutButton = document.getElementById("logout-button");

// Display login messages
function showLoginMessage(message, type = "error") {
  loginMessage.textContent = message;
  loginMessage.style.color =
    type === "success" ? "#27AE60" : "#E05252";
}

// Show authenticated portal
function showPortal() {
  loginScreen.hidden = true;
  portalHeader.hidden = false;
  portalApp.hidden = false;
}

// Show login screen
function showLogin() {
  loginScreen.hidden = false;
  portalHeader.hidden = true;
  portalApp.hidden = true;
}

// Verify authenticated staff account
async function verifyActiveStaff(user) {
  const { data, error } = await supabaseClient
    .from("staff_accounts")
    .select("staff_id, full_name, role, status")
    .eq("auth_user_id", user.id)
    .eq("status", "Active")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

// Check existing login session
async function initializePortal() {
  showLogin();

  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) {
    showLoginMessage("Unable to verify your session.");
    return;
  }

  const session = data.session;

  if (!session) {
    return;
  }

  try {
    const staff = await verifyActiveStaff(session.user);

    if (!staff) {
      await supabaseClient.auth.signOut();
      showLoginMessage(
        "Your account is not authorized for portal access."
      );
      return;
    }

    showPortal();
  } catch (error) {
    console.error("Staff verification error:", error);
    showLoginMessage(
      "Unable to verify staff access. Please try again."
    );
  }
}

// Staff login
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

    if (error) {
      throw error;
    }

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

// Staff logout
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
  showLoginMessage("You have successfully signed out.", "success");
});

// Start portal
initializePortal();

