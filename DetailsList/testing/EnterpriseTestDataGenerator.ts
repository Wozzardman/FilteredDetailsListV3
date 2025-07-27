/**
 * Enterprise Test Data Generator
 * Generates massive datasets for performance testing
 * Meta/Google-scale data generation (millions of records)
 */

export interface DataGeneratorConfig {
    recordCount: number;
    columnCount: number;
    complexity: 'simple' | 'complex' | 'enterprise';
    includeImages: boolean;
    includeDates: boolean;
    includeNumbers: boolean;
    includeChoices: boolean;
    seed?: number;
}

export interface TestRecord {
    id: string | number;
    [key: string]: any;
}

export class EnterpriseTestDataGenerator {
    private static instance: EnterpriseTestDataGenerator;
    private seedValue: number;

    // Sample data pools for realistic generation
    private readonly firstNames = [
        'John',
        'Jane',
        'Michael',
        'Sarah',
        'David',
        'Lisa',
        'Robert',
        'Jennifer',
        'William',
        'Ashley',
        'James',
        'Jessica',
        'Christopher',
        'Amanda',
        'Daniel',
        'Melissa',
        'Matthew',
        'Michelle',
        'Anthony',
        'Kimberly',
        'Mark',
        'Amy',
        'Donald',
        'Angela',
        'Steven',
        'Helen',
        'Paul',
        'Anna',
        'Andrew',
        'Brenda',
        'Kenneth',
        'Emma',
        'Kevin',
        'Olivia',
        'Brian',
        'Sophia',
        'George',
        'Chloe',
        'Timothy',
        'Isabella',
    ];

    private readonly lastNames = [
        'Smith',
        'Johnson',
        'Williams',
        'Brown',
        'Jones',
        'Garcia',
        'Miller',
        'Davis',
        'Rodriguez',
        'Martinez',
        'Hernandez',
        'Lopez',
        'Gonzalez',
        'Wilson',
        'Anderson',
        'Thomas',
        'Taylor',
        'Moore',
        'Jackson',
        'Martin',
        'Lee',
        'Perez',
        'Thompson',
        'White',
        'Harris',
        'Sanchez',
        'Clark',
        'Ramirez',
        'Lewis',
        'Robinson',
        'Walker',
        'Young',
        'Allen',
        'King',
        'Wright',
        'Scott',
        'Torres',
        'Nguyen',
        'Hill',
        'Flores',
    ];

    private readonly companies = [
        'Microsoft',
        'Google',
        'Amazon',
        'Apple',
        'Meta',
        'Netflix',
        'Tesla',
        'Salesforce',
        'Oracle',
        'Adobe',
        'IBM',
        'Intel',
        'Cisco',
        'PayPal',
        'Uber',
        'Airbnb',
        'Spotify',
        'Twitter',
        'LinkedIn',
        'Zoom',
        'Slack',
        'Dropbox',
        'Atlassian',
        'Square',
        'Stripe',
        'Shopify',
        'Twilio',
        'MongoDB',
        'Snowflake',
        'Palantir',
    ];

    private readonly departments = [
        'Engineering',
        'Sales',
        'Marketing',
        'Human Resources',
        'Finance',
        'Operations',
        'Legal',
        'Product',
        'Design',
        'Support',
        'Security',
        'Data Science',
        'DevOps',
        'QA',
        'Research',
        'Business Development',
    ];

    private readonly jobTitles = [
        'Software Engineer',
        'Senior Engineer',
        'Principal Engineer',
        'Engineering Manager',
        'Director of Engineering',
        'Sales Representative',
        'Account Manager',
        'Sales Director',
        'VP of Sales',
        'Marketing Manager',
        'Product Manager',
        'Senior Product Manager',
        'Director of Product',
        'VP of Product',
        'Designer',
        'Senior Designer',
        'Design Director',
        'Data Scientist',
        'Senior Data Scientist',
        'ML Engineer',
        'DevOps Engineer',
        'Site Reliability Engineer',
        'Security Engineer',
        'QA Engineer',
        'Support Specialist',
    ];

    private readonly statuses = ['Active', 'Inactive', 'Pending', 'Suspended', 'Archived'];
    private readonly priorities = ['Low', 'Medium', 'High', 'Critical'];
    private readonly categories = ['Software', 'Hardware', 'Services', 'Support', 'Training', 'Consulting'];

    constructor(seed?: number) {
        this.seedValue = seed || Date.now();
    }

    public static getInstance(seed?: number): EnterpriseTestDataGenerator {
        if (!EnterpriseTestDataGenerator.instance) {
            EnterpriseTestDataGenerator.instance = new EnterpriseTestDataGenerator(seed);
        }
        return EnterpriseTestDataGenerator.instance;
    }

    // Seeded random number generator for consistent results
    private seededRandom(): number {
        const x = Math.sin(this.seedValue++) * 10000;
        return x - Math.floor(x);
    }

    private randomChoice<T>(array: T[]): T {
        return array[Math.floor(this.seededRandom() * array.length)];
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(this.seededRandom() * (max - min + 1)) + min;
    }

    private randomFloat(min: number, max: number, decimals: number = 2): number {
        const value = this.seededRandom() * (max - min) + min;
        return Number(value.toFixed(decimals));
    }

    private randomDate(startYear: number = 2020, endYear: number = 2024): Date {
        const start = new Date(startYear, 0, 1);
        const end = new Date(endYear, 11, 31);
        return new Date(start.getTime() + this.seededRandom() * (end.getTime() - start.getTime()));
    }

    private generateEmail(firstName: string, lastName: string): string {
        const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'company.com', 'enterprise.org'];
        const domain = this.randomChoice(domains);
        return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
    }

    private generatePhoneNumber(): string {
        const areaCode = this.randomInt(200, 999);
        const exchange = this.randomInt(200, 999);
        const number = this.randomInt(1000, 9999);
        return `(${areaCode}) ${exchange}-${number}`;
    }

    private generateAddress(): string {
        const streetNumber = this.randomInt(1, 9999);
        const streets = ['Main St', 'Oak Ave', 'First St', 'Second St', 'Park Ave', 'Elm St', 'Maple Ave'];
        const street = this.randomChoice(streets);
        return `${streetNumber} ${street}`;
    }

    private generateLongText(sentences: number = 3): string {
        const sampleSentences = [
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
            'Duis aute irure dolor in reprehenderit in voluptate velit esse.',
            'Excepteur sint occaecat cupidatat non proident, sunt in culpa.',
            'Qui officia deserunt mollit anim id est laborum.',
            'At vero eos et accusamus et iusto odio dignissimos ducimus.',
            'Et harum quidem rerum facilis est et expedita distinctio.',
        ];

        const result = [];
        for (let i = 0; i < sentences; i++) {
            result.push(this.randomChoice(sampleSentences));
        }
        return result.join(' ');
    }

    // Generate massive datasets efficiently
    public generateDataset(config: DataGeneratorConfig): TestRecord[] {
        console.time('Dataset Generation');
        console.log(`Generating ${config.recordCount.toLocaleString()} records with ${config.columnCount} columns...`);

        const records: TestRecord[] = [];
        const batchSize = 10000; // Process in batches for memory efficiency

        for (let batch = 0; batch < Math.ceil(config.recordCount / batchSize); batch++) {
            const batchStart = batch * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, config.recordCount);

            for (let i = batchStart; i < batchEnd; i++) {
                records.push(this.generateRecord(i, config));

                // Progress indicator for large datasets
                if (i > 0 && i % 50000 === 0) {
                    console.log(`Generated ${i.toLocaleString()} records...`);
                }
            }
        }

        console.timeEnd('Dataset Generation');
        console.log(`✅ Generated ${records.length.toLocaleString()} records successfully`);

        return records;
    }

    private generateRecord(index: number, config: DataGeneratorConfig): TestRecord {
        const firstName = this.randomChoice(this.firstNames);
        const lastName = this.randomChoice(this.lastNames);

        const baseRecord: TestRecord = {
            id: index + 1,
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            email: this.generateEmail(firstName, lastName),
            company: this.randomChoice(this.companies),
            department: this.randomChoice(this.departments),
            jobTitle: this.randomChoice(this.jobTitles),
            status: this.randomChoice(this.statuses),
            priority: this.randomChoice(this.priorities),
            category: this.randomChoice(this.categories),
        };

        // Add phone numbers
        baseRecord.phone = this.generatePhoneNumber();
        baseRecord.mobile = this.generatePhoneNumber();

        // Add addresses
        baseRecord.address = this.generateAddress();

        // Add dates if requested
        if (config.includeDates) {
            baseRecord.createdDate = this.randomDate(2020, 2024);
            baseRecord.modifiedDate = this.randomDate(2023, 2024);
            baseRecord.birthDate = this.randomDate(1960, 2000);
            baseRecord.hireDate = this.randomDate(2015, 2024);
        }

        // Add numbers if requested
        if (config.includeNumbers) {
            baseRecord.salary = this.randomFloat(30000, 200000, 0);
            baseRecord.rating = this.randomFloat(1, 5, 1);
            baseRecord.experience = this.randomInt(0, 30);
            baseRecord.projectCount = this.randomInt(0, 50);
            baseRecord.score = this.randomFloat(0, 100, 1);
        }

        // Add choices if requested
        if (config.includeChoices) {
            baseRecord.workLocation = this.randomChoice(['Office', 'Remote', 'Hybrid']);
            baseRecord.employmentType = this.randomChoice(['Full-time', 'Part-time', 'Contract', 'Intern']);
            baseRecord.level = this.randomChoice(['Junior', 'Mid', 'Senior', 'Lead', 'Principal']);
        }

        // Add complex data for enterprise complexity
        if (config.complexity === 'enterprise' || config.complexity === 'complex') {
            baseRecord.description = this.generateLongText(this.randomInt(2, 5));
            baseRecord.notes = this.generateLongText(this.randomInt(1, 3));
            baseRecord.tags = Array.from({ length: this.randomInt(1, 5) }, () =>
                this.randomChoice(['important', 'urgent', 'review', 'approved', 'pending', 'archived']),
            );

            // Nested object data
            baseRecord.metadata = {
                created: {
                    user: `${firstName} ${lastName}`,
                    timestamp: this.randomDate(2023, 2024).toISOString(),
                    ip: `192.168.${this.randomInt(1, 255)}.${this.randomInt(1, 255)}`,
                },
                modified: {
                    user: this.randomChoice(['System', 'Admin', 'Manager']),
                    timestamp: this.randomDate(2024, 2024).toISOString(),
                    reason: this.randomChoice(['Update', 'Correction', 'Review', 'Approval']),
                },
            };
        }

        // Add additional columns if requested
        const existingColumns = Object.keys(baseRecord).length;
        const additionalColumns = config.columnCount - existingColumns;

        for (let i = 0; i < additionalColumns; i++) {
            const columnName = `customField${i + 1}`;

            // Vary the data types
            const dataType = this.randomInt(1, 5);
            switch (dataType) {
                case 1:
                    baseRecord[columnName] = this.randomChoice(['Option A', 'Option B', 'Option C']);
                    break;
                case 2:
                    baseRecord[columnName] = this.randomFloat(0, 1000, 2);
                    break;
                case 3:
                    baseRecord[columnName] = this.randomDate().toISOString().split('T')[0];
                    break;
                case 4:
                    baseRecord[columnName] = this.randomChoice([true, false]);
                    break;
                default:
                    baseRecord[columnName] = `Value ${this.randomInt(1, 1000)}`;
            }
        }

        return baseRecord;
    }

    // Generate specific performance test scenarios
    public generatePerformanceTestSuite(): {
        small: TestRecord[];
        medium: TestRecord[];
        large: TestRecord[];
        massive: TestRecord[];
    } {
        console.log('🚀 Generating Enterprise Performance Test Suite...');

        const configs = {
            small: {
                recordCount: 1000,
                columnCount: 10,
                complexity: 'simple' as const,
                includeImages: false,
                includeDates: true,
                includeNumbers: true,
                includeChoices: true,
            },
            medium: {
                recordCount: 50000,
                columnCount: 15,
                complexity: 'complex' as const,
                includeImages: false,
                includeDates: true,
                includeNumbers: true,
                includeChoices: true,
            },
            large: {
                recordCount: 250000,
                columnCount: 20,
                complexity: 'complex' as const,
                includeImages: false,
                includeDates: true,
                includeNumbers: true,
                includeChoices: true,
            },
            massive: {
                recordCount: 1000000,
                columnCount: 25,
                complexity: 'enterprise' as const,
                includeImages: false,
                includeDates: true,
                includeNumbers: true,
                includeChoices: true,
            },
        };

        return {
            small: this.generateDataset(configs.small),
            medium: this.generateDataset(configs.medium),
            large: this.generateDataset(configs.large),
            massive: this.generateDataset(configs.massive),
        };
    }

    // Generate columns for testing
    public generateColumns(
        count: number,
    ): Array<{ key: string; name: string; fieldName: string; minWidth: number; maxWidth: number }> {
        const baseColumns = [
            { key: 'id', name: 'ID', fieldName: 'id', minWidth: 80, maxWidth: 100 },
            { key: 'fullName', name: 'Full Name', fieldName: 'fullName', minWidth: 150, maxWidth: 200 },
            { key: 'email', name: 'Email', fieldName: 'email', minWidth: 200, maxWidth: 300 },
            { key: 'company', name: 'Company', fieldName: 'company', minWidth: 120, maxWidth: 180 },
            { key: 'department', name: 'Department', fieldName: 'department', minWidth: 120, maxWidth: 160 },
            { key: 'jobTitle', name: 'Job Title', fieldName: 'jobTitle', minWidth: 140, maxWidth: 200 },
            { key: 'status', name: 'Status', fieldName: 'status', minWidth: 100, maxWidth: 120 },
            { key: 'priority', name: 'Priority', fieldName: 'priority', minWidth: 100, maxWidth: 120 },
            { key: 'phone', name: 'Phone', fieldName: 'phone', minWidth: 120, maxWidth: 150 },
            { key: 'address', name: 'Address', fieldName: 'address', minWidth: 200, maxWidth: 300 },
        ];

        const columns = [...baseColumns];

        // Add additional columns if needed
        for (let i = baseColumns.length; i < count; i++) {
            columns.push({
                key: `customField${i - baseColumns.length + 1}`,
                name: `Custom Field ${i - baseColumns.length + 1}`,
                fieldName: `customField${i - baseColumns.length + 1}`,
                minWidth: 100,
                maxWidth: 200,
            });
        }

        return columns.slice(0, count);
    }

    // Memory usage estimation
    public estimateMemoryUsage(
        recordCount: number,
        columnCount: number,
    ): {
        estimatedMB: number;
        estimatedGB: number;
        recommendation: string;
    } {
        // Rough estimation: each cell ~64 bytes average
        const bytesPerCell = 64;
        const totalBytes = recordCount * columnCount * bytesPerCell;
        const estimatedMB = totalBytes / (1024 * 1024);
        const estimatedGB = estimatedMB / 1024;

        let recommendation = '';
        if (estimatedMB < 100) {
            recommendation = 'Excellent performance expected';
        } else if (estimatedMB < 500) {
            recommendation = 'Good performance with virtualization';
        } else if (estimatedMB < 1024) {
            recommendation = 'Use chunking and infinite loading';
        } else {
            recommendation = 'Consider server-side filtering and pagination';
        }

        return {
            estimatedMB: Math.round(estimatedMB * 100) / 100,
            estimatedGB: Math.round(estimatedGB * 100) / 100,
            recommendation,
        };
    }
}

// Factory functions for common scenarios
export const createTestDataset = (size: 'small' | 'medium' | 'large' | 'massive') => {
    const generator = EnterpriseTestDataGenerator.getInstance();

    const configs = {
        small: { recordCount: 1000, columnCount: 10, complexity: 'simple' as const },
        medium: { recordCount: 25000, columnCount: 15, complexity: 'complex' as const },
        large: { recordCount: 100000, columnCount: 20, complexity: 'complex' as const },
        massive: { recordCount: 500000, columnCount: 25, complexity: 'enterprise' as const },
    };

    const config = {
        ...configs[size],
        includeImages: false,
        includeDates: true,
        includeNumbers: true,
        includeChoices: true,
    };

    return generator.generateDataset(config);
};

export const createTestColumns = (count: number) => {
    const generator = EnterpriseTestDataGenerator.getInstance();
    return generator.generateColumns(count);
};
