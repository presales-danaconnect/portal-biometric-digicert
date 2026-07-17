export interface MockIdentity {
  firstName: string;
  lastName: string;
  birthDate: string;
}

export const MOCK_IDENTITIES: Record<string, MockIdentity> = {
  '1148214469': {
    firstName: 'Esteban Emanuel',
    lastName: 'Niño Castro',
    birthDate: '2014-09-26',
  },
  '22641375': {
    firstName: 'Lizeth Lorena',
    lastName: 'Castro Ruiz',
    birthDate: '1980-12-28',
  },
};

export const DEFAULT_MOCK_IDENTITY: MockIdentity = {
  firstName: 'Juan Carlos',
  lastName: 'Garcia Lopez',
  birthDate: '1990-05-15',
};
