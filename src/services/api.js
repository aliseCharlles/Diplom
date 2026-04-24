import axios from "axios";

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "/api" : "http://127.0.0.1:5001/api"),
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  console.log("Interceptor - token from localStorage:", token); 
  
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    console.log("Interceptor - Authorization header set:", config.headers.Authorization); // ДОБАВЬТЕ ЭТО
  } else {
    console.warn("Interceptor - No token found!");
  }
  
  console.log("Request config:", {
    url: config.url,
    method: config.method,
    headers: config.headers
  }); 
  
  return config;
});


export const loginUser = (data) => API.post("/users/login", data);
export const registerUser = (data) => API.post("/users/register", data);

export const getTasks = (languageId) => {
  return API.get('/tasks', {
    params: { language_id: languageId } 
  });
};

export const getTheoryModules = (languageId) =>
  API.get("/theory/modules", {
    params: { languageId },
  });

export const getAchievements = () => API.get("/theory/achievements");

export const executeCode = (payload) => API.post("/code/execute", payload);
export const getProgressOverview = (params) => API.get("/progress/overview", { params });

/** mode: "hint" | "check" — подсказка или проверка через локальную Ollama */
export const aiTutorCheck = (payload) => API.post("/ai/check", payload);

/** Структурированный JSON-разбор (Ollama) */
export const aiTutorAnalyze = (payload) => API.post("/ai/analyze", payload);

// Новая функция для завершения задания
export const completeTask = (taskId) => 
  API.post("/user-task/complete", { taskId });

export const getAdminUsers = () => API.get("/admin/users");
export const setUserAdminRole = (userId, isAdmin) =>
  API.patch(`/admin/users/${userId}/admin`, { is_admin: isAdmin });

export const getAiSettings = () => API.get("/ai/settings");
export const updateAiModel = (model) => API.patch("/ai/settings/model", { model });