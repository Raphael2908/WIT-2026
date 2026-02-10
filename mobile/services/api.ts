/**
 * REST API client for Adaptive Speech Decoder backend.
 * Handles all HTTP requests with error handling and dev logging.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

interface ApiError {
  status: number;
  message: string;
}

/**
 * Performs a GET request
 */
async function get<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`[API] GET ${url}`);
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error: ApiError = {
        status: response.status,
        message: errorText || `HTTP ${response.status}: ${response.statusText}`,
      };

      if (__DEV__) {
        console.error(`[API] GET ${url} failed:`, error);
      }

      throw error;
    }

    const data = await response.json();

    if (__DEV__) {
      console.log(`[API] GET ${url} succeeded:`, data);
    }

    return data as T;
  } catch (error) {
    if ((error as any).status) {
      throw error;
    }

    const apiError: ApiError = {
      status: 0,
      message: error instanceof Error ? error.message : "Network request failed",
    };

    if (__DEV__) {
      console.error(`[API] GET ${url} network error:`, apiError);
    }

    throw apiError;
  }
}

/**
 * Performs a POST request with JSON body
 */
async function post<T>(path: string, body: any): Promise<T> {
  const url = `${BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`[API] POST ${url}`, body);
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error: ApiError = {
        status: response.status,
        message: errorText || `HTTP ${response.status}: ${response.statusText}`,
      };

      if (__DEV__) {
        console.error(`[API] POST ${url} failed:`, error);
      }

      throw error;
    }

    const data = await response.json();

    if (__DEV__) {
      console.log(`[API] POST ${url} succeeded:`, data);
    }

    return data as T;
  } catch (error) {
    if ((error as any).status) {
      throw error;
    }

    const apiError: ApiError = {
      status: 0,
      message: error instanceof Error ? error.message : "Network request failed",
    };

    if (__DEV__) {
      console.error(`[API] POST ${url} network error:`, apiError);
    }

    throw apiError;
  }
}

/**
 * Performs a PATCH request with JSON body
 */
async function patch<T>(path: string, body: any): Promise<T> {
  const url = `${BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`[API] PATCH ${url}`, body);
  }

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error: ApiError = {
        status: response.status,
        message: errorText || `HTTP ${response.status}: ${response.statusText}`,
      };

      if (__DEV__) {
        console.error(`[API] PATCH ${url} failed:`, error);
      }

      throw error;
    }

    const data = await response.json();

    if (__DEV__) {
      console.log(`[API] PATCH ${url} succeeded:`, data);
    }

    return data as T;
  } catch (error) {
    if ((error as any).status) {
      throw error;
    }

    const apiError: ApiError = {
      status: 0,
      message: error instanceof Error ? error.message : "Network request failed",
    };

    if (__DEV__) {
      console.error(`[API] PATCH ${url} network error:`, apiError);
    }

    throw apiError;
  }
}

/**
 * Performs a DELETE request
 */
async function del<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`[API] DELETE ${url}`);
  }

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error: ApiError = {
        status: response.status,
        message: errorText || `HTTP ${response.status}: ${response.statusText}`,
      };

      if (__DEV__) {
        console.error(`[API] DELETE ${url} failed:`, error);
      }

      throw error;
    }

    const data = await response.json();

    if (__DEV__) {
      console.log(`[API] DELETE ${url} succeeded:`, data);
    }

    return data as T;
  } catch (error) {
    if ((error as any).status) {
      throw error;
    }

    const apiError: ApiError = {
      status: 0,
      message: error instanceof Error ? error.message : "Network request failed",
    };

    if (__DEV__) {
      console.error(`[API] DELETE ${url} network error:`, apiError);
    }

    throw apiError;
  }
}

/**
 * Performs a POST request with FormData (multipart/form-data)
 * No Content-Type header is set; browser/fetch will set boundary automatically
 */
async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const url = `${BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`[API] POST (FormData) ${url}`);
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      // Do NOT set Content-Type header for FormData - fetch will set it with boundary
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error: ApiError = {
        status: response.status,
        message: errorText || `HTTP ${response.status}: ${response.statusText}`,
      };

      if (__DEV__) {
        console.error(`[API] POST (FormData) ${url} failed:`, error);
      }

      throw error;
    }

    const data = await response.json();

    if (__DEV__) {
      console.log(`[API] POST (FormData) ${url} succeeded:`, data);
    }

    return data as T;
  } catch (error) {
    if ((error as any).status) {
      throw error;
    }

    const apiError: ApiError = {
      status: 0,
      message: error instanceof Error ? error.message : "Network request failed",
    };

    if (__DEV__) {
      console.error(`[API] POST (FormData) ${url} network error:`, apiError);
    }

    throw apiError;
  }
}

/**
 * Exported API client with all HTTP methods
 */
export const api = {
  get,
  post,
  patch,
  del,
  postFormData,
};
