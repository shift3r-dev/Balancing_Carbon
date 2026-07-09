import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';

import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { createClient, type User } from '@supabase/supabase-js';


// ============================================================
// ENVIRONMENT VALIDATION
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    'Missing SUPABASE_URL environment variable.'
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing SUPABASE_ANON_KEY environment variable.'
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY environment variable.'
  );
}


// ============================================================
// SUPABASE CLIENTS
// ============================================================

/**
 * Normal authentication client.
 *
 * Used for operations such as:
 * - signInWithPassword()
 *
 * This client uses the Supabase anon key.
 */
const supabaseAuth = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);


/**
 * Privileged server-only client.
 *
 * IMPORTANT:
 * Never expose SUPABASE_SERVICE_ROLE_KEY to frontend code.
 */
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);


// ============================================================
// EXPRESS APP
// ============================================================

const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '10mb',
  })
);


// ============================================================
// TYPES
// ============================================================

interface AuthenticatedRequest extends Request {
  authUser?: User;
}


interface Organisation {
  id: string;
  name: string;

  industry: string | null;
  location: string | null;
  employee_count: number | null;
  reporting_year: string | null;
  target_reduction_percent: number | null;
}


interface Profile {
  id: string;
  full_name: string;
  organisation_id: string;
  role: string;
  created_at: string;
}


interface SignupRequestBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  organisationName?: unknown;
}


interface LoginRequestBody {
  email?: unknown;
  password?: unknown;
}


// ============================================================
// HELPERS
// ============================================================

function generateOrganisationId(): string {
  return `org-${randomUUID()}`;
}


function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}


function isValidEmail(email: string): boolean {
  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailPattern.test(email);
}


function getBearerToken(req: Request): string | null {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');

  if (
    scheme?.toLowerCase() !== 'bearer' ||
    !token
  ) {
    return null;
  }

  return token.trim();
}


// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        authenticated: false,
        error: 'Authentication required.',
      });
    }

    const {
      data,
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      console.error(
        'Token verification failed:',
        error
      );

      return res.status(401).json({
        authenticated: false,
        error:
          'Invalid or expired authentication token.',
      });
    }

    req.authUser = data.user;

    next();
  } catch (error) {
    console.error(
      'Authentication middleware error:',
      error
    );

    return res.status(500).json({
      authenticated: false,
      error:
        'Unable to verify authentication.',
    });
  }
}


// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  '/api/health',
  (_req: Request, res: Response) => {
    return res.status(200).json({
      status: 'ok',
      service: 'Balancing Carbon API',
      timestamp: new Date().toISOString(),
    });
  }
);


// ============================================================
// SIGN UP
// ============================================================

app.post(
  '/api/auth/signup',
  async (
    req: Request<
      Record<string, never>,
      unknown,
      SignupRequestBody
    >,
    res: Response
  ) => {
    let createdUserId: string | null = null;

    let createdOrganisationId:
      | string
      | null = null;

    try {
      const {
        name,
        email,
        password,
        organisationName,
      } = req.body;


      // --------------------------------------------------------
      // VALIDATE FULL NAME
      // --------------------------------------------------------

      if (
        typeof name !== 'string' ||
        !name.trim()
      ) {
        return res.status(400).json({
          error: 'Full name is required.',
        });
      }


      if (name.trim().length > 150) {
        return res.status(400).json({
          error:
            'Full name must not exceed 150 characters.',
        });
      }


      // --------------------------------------------------------
      // VALIDATE EMAIL
      // --------------------------------------------------------

      if (
        typeof email !== 'string' ||
        !email.trim()
      ) {
        return res.status(400).json({
          error: 'Email address is required.',
        });
      }

      const normalizedEmail =
        normalizeEmail(email);

      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({
          error:
            'Please enter a valid email address.',
        });
      }


      // --------------------------------------------------------
      // VALIDATE ORGANISATION
      // --------------------------------------------------------

      if (
        typeof organisationName !== 'string' ||
        !organisationName.trim()
      ) {
        return res.status(400).json({
          error:
            'Organisation name is required.',
        });
      }

      if (
        organisationName.trim().length > 200
      ) {
        return res.status(400).json({
          error:
            'Organisation name must not exceed 200 characters.',
        });
      }


      // --------------------------------------------------------
      // VALIDATE PASSWORD
      // --------------------------------------------------------

      if (typeof password !== 'string') {
        return res.status(400).json({
          error: 'Password is required.',
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error:
            'Password must contain at least 8 characters.',
        });
      }

      if (password.length > 128) {
        return res.status(400).json({
          error:
            'Password must not exceed 128 characters.',
        });
      }


      // --------------------------------------------------------
      // CREATE SUPABASE AUTH USER
      // --------------------------------------------------------

      const {
        data: authData,
        error: authError,
      } =
        await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password,

          // TEMPORARY:
          // Suitable for your current dummy/test deployment.
          // Change this to false later when email verification
          // is configured.
          email_confirm: true,

          user_metadata: {
            full_name: name.trim(),

            organisation_name:
              organisationName.trim(),
          },
        });


      if (authError || !authData.user) {
        console.error(
          'Supabase user creation failed:',
          authError
        );

        const message =
          authError?.message?.toLowerCase() ?? '';

        if (
          message.includes('already') ||
          message.includes('registered') ||
          message.includes('exists')
        ) {
          return res.status(409).json({
            error:
              'An account with this email already exists.',
          });
        }

        return res.status(400).json({
          error:
            authError?.message ||
            'Unable to create user account.',
        });
      }


      createdUserId = authData.user.id;


      // --------------------------------------------------------
      // GENERATE ORGANISATION ID
      // --------------------------------------------------------

      const organisationId =
        generateOrganisationId();


      // --------------------------------------------------------
      // CREATE ORGANISATION
      // --------------------------------------------------------

      const {
        data: organisation,
        error: organisationError,
      } = await supabaseAdmin
        .from('organisations')
        .insert({
          id: organisationId,
          name: organisationName.trim(),
        })
        .select(
          `
            id,
            name,
            industry,
            location,
            employee_count,
            reporting_year,
            target_reduction_percent
          `
        )
        .single<Organisation>();


      if (
        organisationError ||
        !organisation
      ) {
        throw new Error(
          `Organisation creation failed: ${
            organisationError?.message ||
            'Unknown database error'
          }`
        );
      }


      createdOrganisationId =
        organisation.id;


      // --------------------------------------------------------
      // CREATE PROFILE
      // --------------------------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: createdUserId,

          full_name: name.trim(),

          organisation_id:
            organisation.id,

          role: 'organisation_admin',
        })
        .select(
          `
            id,
            full_name,
            organisation_id,
            role,
            created_at
          `
        )
        .single<Profile>();


      if (
        profileError ||
        !profile
      ) {
        throw new Error(
          `Profile creation failed: ${
            profileError?.message ||
            'Unknown database error'
          }`
        );
      }


      // --------------------------------------------------------
      // AUTOMATIC LOGIN AFTER SIGNUP
      // --------------------------------------------------------

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabaseAuth.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });


      if (sessionError) {
        console.error(
          'Automatic login after signup failed:',
          sessionError
        );
      }


      // --------------------------------------------------------
      // SUCCESS RESPONSE
      // --------------------------------------------------------

      return res.status(201).json({
        authenticated: Boolean(
          sessionData.session
        ),

        accessToken:
          sessionData.session?.access_token ??
          null,

        refreshToken:
          sessionData.session?.refresh_token ??
          null,

        expiresAt:
          sessionData.session?.expires_at ??
          null,

        user: {
          id: createdUserId,

          name: profile.full_name,

          email: normalizedEmail,

          role: profile.role,

          organisationId:
            profile.organisation_id,
        },

        organisation,
      });
    } catch (error) {
      console.error(
        'Registration failed:',
        error
      );


      // --------------------------------------------------------
      // COMPENSATING ROLLBACK
      // --------------------------------------------------------
      //
      // Supabase Auth and database inserts aren't currently
      // executed as one PostgreSQL transaction.
      //
      // Therefore, if a later step fails, clean up earlier
      // resources so no orphaned account remains.
      // --------------------------------------------------------


      if (createdOrganisationId) {
        const {
          error: organisationDeleteError,
        } = await supabaseAdmin
          .from('organisations')
          .delete()
          .eq(
            'id',
            createdOrganisationId
          );


        if (organisationDeleteError) {
          console.error(
            'Failed to roll back organisation:',
            organisationDeleteError
          );
        }
      }


      if (createdUserId) {
        const {
          error: userDeleteError,
        } =
          await supabaseAdmin.auth.admin.deleteUser(
            createdUserId
          );


        if (userDeleteError) {
          console.error(
            'Failed to roll back auth user:',
            userDeleteError
          );
        }
      }


      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Registration failed.',
      });
    }
  }
);


// ============================================================
// LOGIN
// ============================================================

app.post(
  '/api/auth/login',
  async (
    req: Request<
      Record<string, never>,
      unknown,
      LoginRequestBody
    >,
    res: Response
  ) => {
    try {
      const {
        email,
        password,
      } = req.body;


      if (
        typeof email !== 'string' ||
        !email.trim()
      ) {
        return res.status(400).json({
          error: 'Email address is required.',
        });
      }


      if (
        typeof password !== 'string' ||
        !password
      ) {
        return res.status(400).json({
          error: 'Password is required.',
        });
      }


      const normalizedEmail =
        normalizeEmail(email);


      const {
        data: authData,
        error: authError,
      } =
        await supabaseAuth.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });


      if (
        authError ||
        !authData.user ||
        !authData.session
      ) {
        console.error(
          'Login failed:',
          authError
        );

        return res.status(401).json({
          error:
            'Invalid email or password.',
        });
      }


      // --------------------------------------------------------
      // LOAD USER PROFILE
      // --------------------------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await supabaseAdmin
        .from('profiles')
        .select(
          `
            id,
            full_name,
            organisation_id,
            role,
            created_at
          `
        )
        .eq(
          'id',
          authData.user.id
        )
        .single<Profile>();


      if (
        profileError ||
        !profile
      ) {
        console.error(
          'Profile lookup failed:',
          profileError
        );

        return res.status(500).json({
          error:
            'Your account exists, but its organisation profile could not be loaded.',
        });
      }


      return res.status(200).json({
        authenticated: true,

        accessToken:
          authData.session.access_token,

        refreshToken:
          authData.session.refresh_token,

        expiresAt:
          authData.session.expires_at,

        user: {
          id: authData.user.id,

          name: profile.full_name,

          email: authData.user.email,

          role: profile.role,

          organisationId:
            profile.organisation_id,
        },
      });
    } catch (error) {
      console.error(
        'Unexpected login error:',
        error
      );

      return res.status(500).json({
        error: 'Login failed.',
      });
    }
  }
);


// ============================================================
// CURRENT USER
// ============================================================

app.get(
  '/api/auth/me',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const authUser = req.authUser!;


      const {
        data: profile,
        error: profileError,
      } = await supabaseAdmin
        .from('profiles')
        .select(
          `
            id,
            full_name,
            organisation_id,
            role,
            created_at
          `
        )
        .eq(
          'id',
          authUser.id
        )
        .single<Profile>();


      if (
        profileError ||
        !profile
      ) {
        console.error(
          'Current-user profile lookup failed:',
          profileError
        );

        return res.status(404).json({
          authenticated: true,

          error:
            'User profile not found.',
        });
      }


      return res.status(200).json({
        authenticated: true,

        user: {
          id: authUser.id,

          name: profile.full_name,

          email: authUser.email,

          role: profile.role,

          organisationId:
            profile.organisation_id,
        },
      });
    } catch (error) {
      console.error(
        'Failed to load current user:',
        error
      );

      return res.status(500).json({
        error:
          'Unable to load user profile.',
      });
    }
  }
);


// ============================================================
// LOGOUT
// ============================================================

app.post(
  '/api/auth/logout',
  requireAuth,
  async (
    _req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      /*
       * With JWT-based authentication, the frontend must
       * remove its stored access/refresh tokens on logout.
       *
       * A future version can implement global server-side
       * session revocation if required.
       */

      return res.status(200).json({
        authenticated: false,

        message:
          'Logged out successfully. Remove the local session tokens.',
      });
    } catch (error) {
      console.error(
        'Logout error:',
        error
      );

      return res.status(500).json({
        error: 'Logout failed.',
      });
    }
  }
);


// ============================================================
// PROTECTED AUTH TEST
// ============================================================

app.get(
  '/api/protected',
  requireAuth,
  (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    return res.status(200).json({
      message:
        'Authentication successful.',

      userId: req.authUser!.id,

      email: req.authUser!.email,
    });
  }
);


// ============================================================
// 404 API HANDLER
// ============================================================

app.use(
  '/api',
  (
    req: Request,
    res: Response
  ) => {
    return res.status(404).json({
      error: 'API endpoint not found.',
      path: req.originalUrl,
    });
  }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      'Unhandled server error:',
      error
    );

    return res.status(500).json({
      error: 'Internal server error.',
    });
  }
);


// ============================================================
// LOCAL DEVELOPMENT SERVER
// ============================================================

if (
  process.env.NODE_ENV !== 'production' &&
  !process.env.VERCEL
) {
  const PORT = Number(
    process.env.PORT || 3000
  );


  app.listen(PORT, () => {
    console.log(
      `Balancing Carbon API running on port ${PORT}`
    );
  });
}


// ============================================================
// VERCEL EXPORT
// ============================================================

// Required by api/index.ts.
export default app;