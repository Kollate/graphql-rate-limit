import { GraphQLResolveInfo } from 'graphql';
import { rule } from 'graphql-shield';
import { GraphQLRateLimitConfig, GraphQLRateLimitDirectiveArgs } from './types';
import { getGraphQLRateLimiter } from './get-graphql-rate-limiter';
import { RateLimitError } from './rate-limit-error';

/**
 * Creates a graphql-shield rate limit rule. e.g.
 *
 * ```js
 * const rateLimit = createRateLimitRule({ identifyContext: (ctx) => ctx.id });
 * const permissions = shield({ Mutation: { signup: rateLimit({ window: '10s', max: 1 }) } })
 * ```
 */
const createRateLimitRule = (config: GraphQLRateLimitConfig) => {
  const rateLimiter = getGraphQLRateLimiter(config);
  return (fieldConfig: GraphQLRateLimitDirectiveArgs) => {
    const noCacheRule = rule({ cache: 'no_cache' });
    return noCacheRule(async (parent, args, context, info) => {
      if (config.disabled) return true;
      const errorMessage = await rateLimiter(
        {
          parent,
          args,
          context,
          info: info as GraphQLResolveInfo // I hope this is so.
        },
        fieldConfig
      );
      if (!errorMessage) return true;
      return config.getError
        ? config.getError(errorMessage)
        : new RateLimitError(errorMessage);
    });
  };
};

export { createRateLimitRule };
