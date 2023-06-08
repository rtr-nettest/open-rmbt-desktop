import { DataTypes, Model, Sequelize } from "sequelize"

export class Measurement extends Model {}

export const createMeasurementModel = (sequelize: Sequelize) =>
    Measurement.init(
        {
            client_uuid: DataTypes.STRING,
            client_name: DataTypes.STRING,
            client_version: DataTypes.STRING,
            model: DataTypes.STRING,
            operating_system: DataTypes.STRING,
            platform: DataTypes.STRING,
            test_token: DataTypes.STRING,
            test_uuid: DataTypes.STRING,
            timezone: DataTypes.STRING,
            type: DataTypes.STRING,
            measurement_server: DataTypes.STRING,
            provider_name: DataTypes.STRING,
            ip_address: DataTypes.STRING,
            network_type: DataTypes.NUMBER,
            test_bytes_download: DataTypes.NUMBER,
            test_bytes_upload: DataTypes.NUMBER,
            test_nsec_download: DataTypes.NUMBER,
            test_nsec_upload: DataTypes.NUMBER,
            test_num_threads: DataTypes.NUMBER,
            test_ping_shortest: DataTypes.NUMBER,
            test_speed_download: DataTypes.NUMBER,
            test_speed_upload: DataTypes.NUMBER,
            time: DataTypes.NUMBER,
            user_server_selection: DataTypes.NUMBER,
            cpu: DataTypes.JSON,
            pings: DataTypes.JSON,
            speed_detail: DataTypes.JSON,
        },
        {
            sequelize, // We need to pass the connection instance
            modelName: "measurement",
        }
    )
