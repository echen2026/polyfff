import { ref } from 'vue'

// Type declarations for Google API
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: any) => void;
          }) => void;
          renderButton: (
            element: HTMLElement | null,
            options: {
              theme?: string;
              size?: string;
              width?: string;
              text?: string;
              shape?: string;
              logo_alignment?: string;
              type?: string;
            }
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GoogleUser {
  email: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export const isAuthenticated = ref(false)
export const currentUser = ref<GoogleUser | null>(null)

export function initGoogleAuth() {
  // Load the Google Sign-In script
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  document.head.appendChild(script)

  script.onload = () => {
    window.google.accounts.id.initialize({
      client_id: '362890821344-t5g7kjb27r3eacvhru9jk4g9osjn409r.apps.googleusercontent.com', // Replace with your actual client ID
      callback: handleGoogleSignIn
    })

    window.google.accounts.id.renderButton(
      document.getElementById('googleSignInButton'),
      { 
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: '280',
        logo_alignment: 'left'
      }
    )
  }
}

async function handleGoogleSignIn(response: any) {
  try {
    // Decode the JWT token
    const payload = decodeJwtResponse(response.credential)
    
    // Set the current user
    currentUser.value = {
      email: payload.email,
      given_name: payload.given_name,
      family_name: payload.family_name,
      picture: payload.picture
    }
    
    isAuthenticated.value = true
  } catch (error) {
    console.error('Error handling Google Sign-In:', error)
  }
}

function decodeJwtResponse(token: string) {
  const base64Url = token.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  }).join(''))
  return JSON.parse(jsonPayload)
}

export function signOut() {
  currentUser.value = null
  isAuthenticated.value = false
  window.google.accounts.id.disableAutoSelect()
} 