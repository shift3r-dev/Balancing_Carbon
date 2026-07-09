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
// FACILITY TYPES
// ============================================================

interface Facility {
  id: string;
  organisation_id: string | null;
  name: string;
  location: string;
  industry_type: string;
  production_output: number;
  production_unit: string;
  reporting_period: string;
  electricity_consumption: number;
  fuel_consumption: number;
  fuel_type: string;
  renewable_energy_usage: number;
  emissions_scope_1: number;
  emissions_scope_2: number;
  carbon_intensity: number;
  esg_readiness_status: string;
}

interface FacilityRequestBody {
  name?: unknown;
  location?: unknown;
  industry_type?: unknown;
  industryType?: unknown;
  production_output?: unknown;
  productionOutput?: unknown;
  production_unit?: unknown;
  productionUnit?: unknown;
  reporting_period?: unknown;
  reportingPeriod?: unknown;
  electricity_consumption?: unknown;
  electricityConsumption?: unknown;
  fuel_consumption?: unknown;
  fuelConsumption?: unknown;
  fuel_type?: unknown;
  fuelType?: unknown;
  renewable_energy_usage?: unknown;
  renewableEnergyUsage?: unknown;
  emissions_scope_1?: unknown;
  emissionsScope1?: unknown;
  emissions_scope_2?: unknown;
  emissionsScope2?: unknown;
  carbon_intensity?: unknown;
  carbonIntensity?: unknown;
  esg_readiness_status?: unknown;
  esgReadinessStatus?: unknown;
}


// ============================================================
// FACILITY HELPERS
// ============================================================

async function getAuthenticatedProfile(
  userId: string
): Promise<Profile> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      full_name,
      organisation_id,
      role,
      created_at
    `)
    .eq('id', userId)
    .single<Profile>();

  if (error || !profile) {
    console.error(
      'Authenticated profile lookup failed:',
      error
    );

    throw new Error(
      'Authenticated user profile could not be loaded.'
    );
  }

  return profile;
}


function getStringValue(
  primary: unknown,
  alternate?: unknown
): string {
  const value =
    typeof primary === 'string'
      ? primary
      : typeof alternate === 'string'
        ? alternate
        : '';

  return value.trim();
}


function getNumericValue(
  primary: unknown,
  alternate?: unknown
): number {
  const rawValue =
    primary !== undefined && primary !== null
      ? primary
      : alternate;

  if (
    rawValue === undefined ||
    rawValue === null ||
    rawValue === ''
  ) {
    return 0;
  }

  const numericValue = Number(rawValue);

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
}


// ============================================================
// GET FACILITIES
// ============================================================

app.get(
  '/api/facilities',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const profile = await getAuthenticatedProfile(
        req.authUser!.id
      );

      const { data: facilities, error } =
        await supabaseAdmin
          .from('facilities')
          .select('*')
          .eq(
            'organisation_id',
            profile.organisation_id
          );

      if (error) {
        console.error(
          'Facility listing failed:',
          error
        );

        return res.status(500).json({
          error: `Failed to load facilities: ${error.message}`,
        });
      }

      return res.status(200).json({
        facilities: facilities ?? [],
      });
    } catch (error) {
      console.error(
        'GET /api/facilities failed:',
        error
      );

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load facilities.',
      });
    }
  }
);


// ============================================================
// CREATE FACILITY
// ============================================================

app.post(
  '/api/facilities',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const profile = await getAuthenticatedProfile(
        req.authUser!.id
      );

      const body =
        req.body as FacilityRequestBody;

      const name = getStringValue(body.name);

      const location = getStringValue(
        body.location
      );

      const industryType = getStringValue(
        body.industry_type,
        body.industryType
      );

      const productionUnit = getStringValue(
        body.production_unit,
        body.productionUnit
      );

      const reportingPeriod = getStringValue(
        body.reporting_period,
        body.reportingPeriod
      );

      const fuelType = getStringValue(
        body.fuel_type,
        body.fuelType
      );

      const esgReadinessStatus =
        getStringValue(
          body.esg_readiness_status,
          body.esgReadinessStatus
        );


      // Validate required text fields.

      const missingFields: string[] = [];

      if (!name) {
        missingFields.push('name');
      }

      if (!location) {
        missingFields.push('location');
      }

      if (!industryType) {
        missingFields.push('industry_type');
      }

      if (!productionUnit) {
        missingFields.push('production_unit');
      }

      if (!reportingPeriod) {
        missingFields.push('reporting_period');
      }

      if (!fuelType) {
        missingFields.push('fuel_type');
      }


      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required facility fields: ${missingFields.join(', ')}`,
        });
      }


      const facilityId =
        `fac-${randomUUID()}`;


      const facilityToInsert = {
        id: facilityId,

        organisation_id:
          profile.organisation_id,

        name,

        location,

        industry_type: industryType,

        production_output:
          getNumericValue(
            body.production_output,
            body.productionOutput
          ),

        production_unit:
          productionUnit,

        reporting_period:
          reportingPeriod,

        electricity_consumption:
          getNumericValue(
            body.electricity_consumption,
            body.electricityConsumption
          ),

        fuel_consumption:
          getNumericValue(
            body.fuel_consumption,
            body.fuelConsumption
          ),

        fuel_type:
          fuelType,

        renewable_energy_usage:
          getNumericValue(
            body.renewable_energy_usage,
            body.renewableEnergyUsage
          ),

        emissions_scope_1:
          getNumericValue(
            body.emissions_scope_1,
            body.emissionsScope1
          ),

        emissions_scope_2:
          getNumericValue(
            body.emissions_scope_2,
            body.emissionsScope2
          ),

        carbon_intensity:
          getNumericValue(
            body.carbon_intensity,
            body.carbonIntensity
          ),

        esg_readiness_status:
          esgReadinessStatus || 'Not Assessed',
      };


      console.log(
        'Creating facility:',
        facilityToInsert
      );


      const { data: facility, error } =
        await supabaseAdmin
          .from('facilities')
          .insert(facilityToInsert)
          .select('*')
          .single<Facility>();


      if (error || !facility) {
        console.error(
          'Facility creation failed:',
          error
        );

        return res.status(500).json({
          error: `Failed to create facility: ${
            error?.message ??
            'Unknown database error'
          }`,
        });
      }


      return res.status(201).json({
        success: true,
        facility,
      });
    } catch (error) {
      console.error(
        'POST /api/facilities failed:',
        error
      );

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create facility.',
      });
    }
  }
);


// ============================================================
// UPDATE FACILITY
// ============================================================

app.patch(
  '/api/facilities/:id',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const profile = await getAuthenticatedProfile(
        req.authUser!.id
      );

      const facilityId = req.params.id;

      const body =
        req.body as FacilityRequestBody;

      const updates: Record<
        string,
        string | number
      > = {};


      if (body.name !== undefined) {
        const value =
          getStringValue(body.name);

        if (!value) {
          return res.status(400).json({
            error:
              'Facility name cannot be empty.',
          });
        }

        updates.name = value;
      }


      if (body.location !== undefined) {
        const value =
          getStringValue(body.location);

        if (!value) {
          return res.status(400).json({
            error:
              'Facility location cannot be empty.',
          });
        }

        updates.location = value;
      }


      if (
        body.industry_type !== undefined ||
        body.industryType !== undefined
      ) {
        updates.industry_type =
          getStringValue(
            body.industry_type,
            body.industryType
          );
      }


      if (
        body.production_output !== undefined ||
        body.productionOutput !== undefined
      ) {
        updates.production_output =
          getNumericValue(
            body.production_output,
            body.productionOutput
          );
      }


      if (
        body.production_unit !== undefined ||
        body.productionUnit !== undefined
      ) {
        updates.production_unit =
          getStringValue(
            body.production_unit,
            body.productionUnit
          );
      }


      if (
        body.reporting_period !== undefined ||
        body.reportingPeriod !== undefined
      ) {
        updates.reporting_period =
          getStringValue(
            body.reporting_period,
            body.reportingPeriod
          );
      }


      if (
        body.electricity_consumption !== undefined ||
        body.electricityConsumption !== undefined
      ) {
        updates.electricity_consumption =
          getNumericValue(
            body.electricity_consumption,
            body.electricityConsumption
          );
      }


      if (
        body.fuel_consumption !== undefined ||
        body.fuelConsumption !== undefined
      ) {
        updates.fuel_consumption =
          getNumericValue(
            body.fuel_consumption,
            body.fuelConsumption
          );
      }


      if (
        body.fuel_type !== undefined ||
        body.fuelType !== undefined
      ) {
        updates.fuel_type =
          getStringValue(
            body.fuel_type,
            body.fuelType
          );
      }


      if (
        body.renewable_energy_usage !== undefined ||
        body.renewableEnergyUsage !== undefined
      ) {
        updates.renewable_energy_usage =
          getNumericValue(
            body.renewable_energy_usage,
            body.renewableEnergyUsage
          );
      }


      if (
        body.emissions_scope_1 !== undefined ||
        body.emissionsScope1 !== undefined
      ) {
        updates.emissions_scope_1 =
          getNumericValue(
            body.emissions_scope_1,
            body.emissionsScope1
          );
      }


      if (
        body.emissions_scope_2 !== undefined ||
        body.emissionsScope2 !== undefined
      ) {
        updates.emissions_scope_2 =
          getNumericValue(
            body.emissions_scope_2,
            body.emissionsScope2
          );
      }


      if (
        body.carbon_intensity !== undefined ||
        body.carbonIntensity !== undefined
      ) {
        updates.carbon_intensity =
          getNumericValue(
            body.carbon_intensity,
            body.carbonIntensity
          );
      }


      if (
        body.esg_readiness_status !== undefined ||
        body.esgReadinessStatus !== undefined
      ) {
        updates.esg_readiness_status =
          getStringValue(
            body.esg_readiness_status,
            body.esgReadinessStatus
          );
      }


      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error:
            'No valid facility fields provided.',
        });
      }


      const { data: facility, error } =
        await supabaseAdmin
          .from('facilities')
          .update(updates)
          .eq('id', facilityId)
          .eq(
            'organisation_id',
            profile.organisation_id
          )
          .select('*')
          .single<Facility>();


      if (error || !facility) {
        console.error(
          'Facility update failed:',
          error
        );

        return res.status(500).json({
          error: `Failed to update facility: ${
            error?.message ??
            'Unknown database error'
          }`,
        });
      }


      return res.status(200).json({
        success: true,
        facility,
      });
    } catch (error) {
      console.error(
        'PATCH /api/facilities/:id failed:',
        error
      );

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update facility.',
      });
    }
  }
);


// ============================================================
// DELETE FACILITY
// ============================================================

app.delete(
  '/api/facilities/:id',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const profile = await getAuthenticatedProfile(
        req.authUser!.id
      );

      const facilityId = req.params.id;


      const { data: deletedFacility, error } =
        await supabaseAdmin
          .from('facilities')
          .delete()
          .eq('id', facilityId)
          .eq(
            'organisation_id',
            profile.organisation_id
          )
          .select('id')
          .maybeSingle();


      if (error) {
        console.error(
          'Facility deletion failed:',
          error
        );

        return res.status(500).json({
          error: `Failed to delete facility: ${error.message}`,
        });
      }


      if (!deletedFacility) {
        return res.status(404).json({
          error:
            'Facility not found or you do not have access to it.',
        });
      }


      return res.status(200).json({
        success: true,
        deletedFacilityId: facilityId,
      });
    } catch (error) {
      console.error(
        'DELETE /api/facilities/:id failed:',
        error
      );

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete facility.',
      });
    }
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