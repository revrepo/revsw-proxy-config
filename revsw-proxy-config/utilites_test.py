"""*************************************************************************
*
* NUU:BIT CONFIDENTIAL
*
* [2013] - [2015] nuu:bit, Inc.
* All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of nuu:bit, Inc. and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to nuu:bit, Inc.
* and its suppliers and may be covered by U.S. and Foreign Patents,
* patents in process, and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from nuu:bit, Inc.
*
"""


class VCLParser():

    def __init__(self, file_name):

        self.file = open(file_name, 'rb')
        self.last_line = None  # variable to contain last readed line


    def get_line(self):
        if self.last_line:
            line = self.last_line
            self.last_line = ''
        else:
            line = self.file.readline()
            if line is None:
                raise Exception
        line = line.strip()
        line = line.strip('*/')
        # skip blank lines and comments
        if not line or line.startswith('#') or line.startswith('/*'):
            line = self.get_line()
        return line

    def parse_object(self):
        data = {}
        data_if = []
        acl = {}
        backends = {}
        try:
            while True:

                line = self.get_line()
                if line == None: break



                if line.endswith('{'):
                    if line.startswith('acl'):
                        splited_line = line.split(' ')
                        acl[splited_line[1]] = self.parse_acl()

                    # if line.startswith('sub'):
                    #     splited_line = line.split(' ')
                    #     acl[splited_line[1]] = self.parse_acl()
                    #
                    # if line.startswith('set'):
                    #     splited_line = line.split(' ')
                    #     acl[splited_line[1]] = self.parse_acl()
                    # find all
                    elif line.startswith('if'):
                        self.last_line = line
                        data_if.append(self.parse_if())

                    elif line.startswith('backend'):
                        splited_line = line.split(' ')
                        backends[splited_line[1]] = self.parse_acl()
                    else:

                        splited_line = line.split(' ')
                        data[splited_line[0]] = self.parse_object()
        except Exception as e:
            print e.message

        return {'data_if': data_if, 'data': data, 'acl': acl}


    def parse_if(self):
        statements = {}

        while True:
            line = self.get_line()
            if line.endswith('}'):
                break
            if line.startswith('if') or line.startswith('elif'):
                if not line.endswith("{") or not line.endswith(')'):
                    self.last_line = line
                    condition = self._parse_conditions()
                else:
                    condition = line
                statements[condition] = self._parse_statement()
            if line.startswith('else'):
                statements['else'] = self._parse_statement()
            else:
                self.last_line = line
                break
        return statements

    def _parse_statement(self):
        lines = []
        while True:
            line = self.get_line()
            if line.endswith('}'):
                break
            else:
                lines.append(line)

        return lines

    def _parse_conditions(self):
        condition = ''
        while True:
            line = self.get_line()
            condition += line
            if line.endswith(')'):
                line = self.get_line()
                if line == '{':
                    break
                else:
                    self.last_line = line
            if line.endswith('{'):
                break
        return condition


    def parse_sub(self):
        data_if = {}


    def parse_acl(self):
        acl = []
        while True:
            line = self.get_line()
            if line.endswith(';'):
                line.strip(';')
                acl.append(line)

            elif line.endswith('}'):
                break
        return acl
