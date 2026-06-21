const API_BASE: string = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  console.error(
    "[PravahAI] VITE_API_URL is not set. " +
    "Create a .env file in the frontend directory with:\n" +
    "  VITE_API_URL=http://localhost:8000"
  );
}

export default API_BASE;
