import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"
import {
    IMeasurementResult,
    IPing,
    ISpeedItem,
} from "../interfaces/measurement-result.interface"
import { ICPU } from "../interfaces/cpu.interface"

@Entity()
export class Measurement implements IMeasurementResult {
    @PrimaryGeneratedColumn()
    id!: number

    @Column({ nullable: true })
    client_name?: string

    @Column({ nullable: true })
    client_version?: string

    @Column()
    client_uuid!: string

    @Column("simple-json", { nullable: true })
    cpu?: ICPU

    @Column({ nullable: true })
    network_type!: number

    @Column({ nullable: true })
    operating_system!: string

    @Column("simple-json", { nullable: true })
    pings!: IPing[]

    @Column({ nullable: true })
    platform!: string

    @Column("simple-json", { nullable: true })
    speed_detail!: ISpeedItem[]

    @Column()
    test_bytes_download!: number

    @Column()
    test_bytes_upload!: number

    @Column()
    test_nsec_download!: number

    @Column()
    test_nsec_upload!: number

    @Column()
    test_num_threads!: number

    @Column()
    test_ping_shortest!: number

    @Column()
    test_speed_download!: number

    @Column()
    test_speed_upload!: number

    @Column()
    test_token!: string

    @Column()
    test_uuid!: string

    @Column()
    time!: number

    @Column({ nullable: true })
    timezone!: string

    @Column({ nullable: true })
    type!: string

    @Column({ nullable: true })
    user_server_selection!: number

    @Column({ nullable: true })
    measurement_server?: string

    @Column({ nullable: true })
    provider_name?: string

    @Column({ nullable: true })
    ip_address?: string

    static fromDto(result: IMeasurementResult) {
        return Object.assign(new Measurement(), result)
    }
}
