/** A lakehouse for clients whose operations return literal data and never query. */
export const literalLakehouse = {
  async queryAll(): Promise<never> {
    throw new Error('Literal fixture operations do not query.');
  },
};
