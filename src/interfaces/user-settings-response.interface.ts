export interface IUserSetingsResponse {
  settings: [{
    urls: {
      url_ipv6_check: string,
      control_ipv4_only: string,
      open_data_prefix: string,
      url_ipv4_check: string,
      control_ipv6_only: string,
      statistics: string,
    },
    uuid: string,
    qostesttype_desc: [{
      name: string,
      test_type: string,
    }]
  }],
  error: any[]
}
